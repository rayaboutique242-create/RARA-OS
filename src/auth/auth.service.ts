// src/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { SessionService } from './services/session.service';
import { EmailService } from './services/email.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Role } from '../common/constants/roles';
import { Tenant } from '../tenants/entities/tenant.entity';

export interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
}

export interface BootstrapDto {
  activationCode: string;
  tenantName: string;
  tenantCode?: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  currency?: string;
  timezone?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly LOCKOUT_THRESHOLD = 5;
  private readonly LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private sessionService: SessionService,
    private emailService: EmailService,
    @InjectRepository(Tenant) private tenantRepository: Repository<Tenant>,
  ) {}

  // ==================== LOGIN ====================

  async login(loginDto: LoginDto, meta: RequestMeta = {}) {
    const { email, password } = loginDto;

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    // Check account lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMs = user.lockedUntil.getTime() - Date.now();
      const remainingMin = Math.ceil(remainingMs / 60000);
      throw new ForbiddenException(
        `Compte verrouillé. Réessayez dans ${remainingMin} minute(s).`,
      );
    }

    // OAuth-only accounts have no password
    if (!user.passwordHash) {
      throw new UnauthorizedException(
        `Ce compte utilise la connexion via ${user.oauthProvider || 'OAuth'}. Utilisez le bouton "${user.oauthProvider}" pour vous connecter.`,
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      // Increment failed attempts
      await this.usersService.incrementFailedLogin(user.id, this.LOCKOUT_THRESHOLD, this.LOCKOUT_DURATION_MS);
      throw new UnauthorizedException('Identifiants invalides');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('Compte désactivé');
    }

    // Reset failed attempts on success
    if (user.failedLoginAttempts > 0) {
      await this.usersService.resetFailedLogin(user.id);
    }

    await this.usersService.updateLastLogin(user.id);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Create session
    const session = await this.sessionService.createSession(
      user.id,
      user.tenantId,
      tokens.refreshToken,
      meta,
    );

    // Store refresh token hash on user (for quick validation)
    await this.usersService.updateRefreshTokenHash(
      user.id,
      this.hashToken(tokens.refreshToken),
    );

    return {
      ...tokens,
      sessionId: session.id,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        tenantId: user.tenantId,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  // ==================== REGISTER ====================

  async register(registerDto: RegisterDto, meta: RequestMeta = {}) {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new BadRequestException('Email déjà utilisé');
    }

    const passwordHash = await bcrypt.hash(registerDto.password, 10);

    // Auto-generate username if not provided
    let username = registerDto.username;
    if (!username) {
      if (registerDto.firstName && registerDto.lastName) {
        username = `${registerDto.firstName.toLowerCase()}${registerDto.lastName.toLowerCase()}`.replace(/\s+/g, '');
      } else {
        username = registerDto.email.split('@')[0];
      }
      // Add random suffix to ensure uniqueness
      username = `${username}${Math.floor(Math.random() * 1000)}`;
    }

    const user = await this.usersService.create({
      email: registerDto.email,
      username: username,
      passwordHash,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      phone: registerDto.phone,
      role: registerDto.role || Role.VENDEUR,
      tenantId: registerDto.tenantId,
      status: 'active',
    });

    const tokens = await this.generateTokens(user);

    const session = await this.sessionService.createSession(
      user.id,
      user.tenantId,
      tokens.refreshToken,
      meta,
    );

    await this.usersService.updateRefreshTokenHash(
      user.id,
      this.hashToken(tokens.refreshToken),
    );

    // Send welcome email (non-blocking)
    this.emailService.sendWelcomeEmail(user.email, user.username).catch(() => {});

    return {
      ...tokens,
      sessionId: session.id,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        tenantId: user.tenantId,
      },
    };
  }

  // ==================== BOOTSTRAP ====================

  async bootstrap(dto: BootstrapDto, meta: RequestMeta = {}) {
    // 1. Verify activation code
    const validCode = this.configService.get<string>('APP_ACTIVATION_CODE', 'RAYA2026');
    if (!dto.activationCode || dto.activationCode.toUpperCase().trim() !== validCode.toUpperCase().trim()) {
      throw new BadRequestException('Code d\'activation invalide');
    }

    // 2. Check if email already exists
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Un compte avec cet email existe déjà');
    }

    // 3. Generate tenant code if not provided
    const tenantCode = dto.tenantCode || 
      dto.tenantName.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 8) + 
      '-' + Date.now().toString(36).toUpperCase();

    // 4. Check if tenant code exists
    const existingTenant = await this.tenantRepository.findOne({ where: { tenantCode } });
    if (existingTenant) {
      throw new ConflictException('Ce code de tenant existe déjà');
    }

    // 5. Create tenant
    const tenant = this.tenantRepository.create({
      tenantCode,
      name: dto.tenantName,
      legalName: dto.tenantName,
      email: dto.email,
      ownerName: `${dto.firstName || ''} ${dto.lastName || ''}`.trim() || dto.email.split('@')[0],
      ownerEmail: dto.email,
      status: 'ACTIVE',
      subscriptionPlan: 'PROFESSIONAL',
      billingCurrency: dto.currency || 'XOF',
      timezone: dto.timezone || 'Africa/Abidjan',
      defaultLanguage: 'fr',
      maxUsers: 10,
      maxProducts: 500,
      maxStores: 3,
      maxOrdersPerMonth: 5000,
      storageQuotaGB: 5,
      featureInventory: true,
      featureOrders: true,
      featureDelivery: true,
      featureSuppliers: true,
      featureAdvancedReports: true,
      featurePromotions: true,
      featureMultiStore: true,
      featureApi: true,
      subscriptionStartDate: new Date(),
      subscriptionEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    });

    const savedTenant = await this.tenantRepository.save(tenant);
    this.logger.log(`Bootstrap: Created tenant ${savedTenant.tenantCode} (${savedTenant.name})`);

    // 6. Create admin user
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const username = dto.firstName && dto.lastName
      ? `${dto.firstName.toLowerCase()}${dto.lastName.toLowerCase()}`.replace(/\s+/g, '')
      : dto.email.split('@')[0];

    const user = await this.usersService.create({
      email: dto.email,
      username: `${username}${Math.floor(Math.random() * 100)}`,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: Role.PDG,
      tenantId: String(savedTenant.id),
      status: 'active',
    });

    this.logger.log(`Bootstrap: Created admin user ${user.email} for tenant ${savedTenant.tenantCode}`);

    // 7. Generate tokens
    const tokens = await this.generateTokens(user);

    const session = await this.sessionService.createSession(
      user.id,
      user.tenantId,
      tokens.refreshToken,
      meta,
    );

    await this.usersService.updateRefreshTokenHash(
      user.id,
      this.hashToken(tokens.refreshToken),
    );

    // Send welcome email
    this.emailService.sendWelcomeEmail(user.email, user.username).catch(() => {});

    return {
      ...tokens,
      sessionId: session.id,
      tenant: {
        id: savedTenant.id,
        tenantCode: savedTenant.tenantCode,
        name: savedTenant.name,
      },
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        tenantId: user.tenantId,
      },
      message: 'Bootstrap réussi ! Vous êtes maintenant administrateur de votre entreprise.',
    };
  }

  // ==================== PROFILE ====================

  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Utilisateur non trouvé');
    }
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      tenantId: user.tenantId,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      status: user.status,
      emailVerified: user.emailVerified,
      oauthProvider: user.oauthProvider,
      createdAt: user.createdAt,
    };
  }

  // ==================== REFRESH TOKEN (with rotation) ====================

  async refreshToken(refreshToken: string, meta: RequestMeta = {}) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'dev-only-refresh-secret',
      });

      const user = await this.usersService.findById(payload.sub);
      if (!user || user.status !== 'active') {
        throw new UnauthorizedException('Utilisateur invalide');
      }

      // Validate against session store
      const session = await this.sessionService.validateRefreshToken(
        user.id,
        refreshToken,
      );
      if (!session) {
        // Possible token reuse attack → revoke ALL sessions
        this.logger.warn(`Possible refresh token reuse for user ${user.id} — revoking all sessions`);
        await this.sessionService.revokeAllSessions(user.id);
        await this.usersService.updateRefreshTokenHash(user.id, null);
        throw new UnauthorizedException('Token de rafraîchissement invalide. Toutes les sessions ont été révoquées.');
      }

      // Generate NEW tokens (rotation)
      const newAccessToken = await this.generateAccessToken(user);
      const newRefreshToken = await this.generateRefreshToken(user);

      // Rotate the refresh token in the session
      await this.sessionService.rotateRefreshToken(session.id, newRefreshToken);
      await this.usersService.updateRefreshTokenHash(
        user.id,
        this.hashToken(newRefreshToken),
      );

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        sessionId: session.id,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Token de rafraîchissement invalide ou expiré');
    }
  }

  // ==================== LOGOUT ====================

  async logout(userId: string, sessionId?: string): Promise<{ message: string }> {
    if (sessionId) {
      await this.sessionService.revokeSession(sessionId, userId);
    }
    await this.usersService.updateRefreshTokenHash(userId, null);
    return { message: 'Déconnexion réussie' };
  }

  async logoutAll(userId: string): Promise<{ message: string; revokedSessions: number }> {
    const revokedSessions = await this.sessionService.revokeAllSessions(userId);
    await this.usersService.updateRefreshTokenHash(userId, null);
    return {
      message: 'Toutes les sessions ont été révoquées',
      revokedSessions,
    };
  }

  // ==================== PASSWORD RESET ====================

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);

    // Always return success (prevent email enumeration)
    if (!user) {
      return { message: 'Si cet email existe, un lien de réinitialisation a été envoyé.' };
    }

    // OAuth-only accounts
    if (!user.passwordHash && user.oauthProvider) {
      return { message: 'Si cet email existe, un lien de réinitialisation a été envoyé.' };
    }

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.usersService.setPasswordResetToken(user.id, hashedToken, expiresAt);

    // Send email (non-blocking)
    this.emailService.sendPasswordResetEmail(user.email, resetToken).catch((err) => {
      this.logger.error(`Failed to send reset email: ${err.message}`);
    });

    return { message: 'Si cet email existe, un lien de réinitialisation a été envoyé.' };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    // Hash the provided token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await this.usersService.findByResetToken(hashedToken);
    if (!user) {
      throw new BadRequestException('Token invalide ou expiré');
    }

    if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      throw new BadRequestException('Token expiré. Veuillez faire une nouvelle demande.');
    }

    // Hash new password and update
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.usersService.updatePassword(user.id, passwordHash);
    await this.usersService.clearPasswordResetToken(user.id);

    // Revoke all sessions (force re-login)
    await this.sessionService.revokeAllSessions(user.id);
    await this.usersService.updateRefreshTokenHash(user.id, null);

    this.logger.log(`Password reset completed for user ${user.id}`);

    return { message: 'Mot de passe réinitialisé avec succès. Veuillez vous reconnecter.' };
  }

  // ==================== CHANGE PASSWORD (authenticated) ====================

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ message: string }> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Utilisateur non trouvé');
    }

    if (!user.passwordHash) {
      throw new BadRequestException(
        `Ce compte utilise OAuth (${user.oauthProvider}). Impossible de changer le mot de passe.`,
      );
    }

    const isCurrentValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      throw new BadRequestException('Mot de passe actuel incorrect');
    }

    // Ensure new password is different
    const isSame = await bcrypt.compare(dto.newPassword, user.passwordHash);
    if (isSame) {
      throw new BadRequestException('Le nouveau mot de passe doit être différent de l\'ancien');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.usersService.updatePassword(user.id, passwordHash);

    this.logger.log(`Password changed for user ${userId}`);

    return { message: 'Mot de passe modifié avec succès' };
  }

  // ==================== OAUTH2 ====================

  async handleOAuthLogin(
    oauthData: {
      provider: string;
      providerId: string;
      email: string;
      firstName?: string;
      lastName?: string;
      avatarUrl?: string;
      username?: string;
    },
    meta: RequestMeta = {},
  ) {
    // Try to find existing user by OAuth provider ID
    let user = await this.usersService.findByOAuthProvider(
      oauthData.provider,
      oauthData.providerId,
    );

    if (!user && oauthData.email) {
      // Try to find by email (account linking)
      const existingUser = await this.usersService.findByEmail(oauthData.email);

      if (existingUser) {
        // Link OAuth to existing account
        await this.usersService.linkOAuthProvider(
          existingUser.id,
          oauthData.provider,
          oauthData.providerId,
          oauthData.avatarUrl,
        );
        user = await this.usersService.findById(existingUser.id);
        this.logger.log(`OAuth ${oauthData.provider} linked to existing user ${existingUser.id}`);
      }
    }

    if (!user) {
      // Create new user from OAuth data
      const defaultTenantId = this.configService.get<string>('DEFAULT_TENANT_ID', 'default');
      user = await this.usersService.create({
        email: oauthData.email,
        username: oauthData.username || oauthData.email?.split('@')[0] || `user_${oauthData.providerId}`,
        firstName: oauthData.firstName,
        lastName: oauthData.lastName,
        avatarUrl: oauthData.avatarUrl,
        oauthProvider: oauthData.provider,
        oauthProviderId: oauthData.providerId,
        emailVerified: true, // OAuth emails are pre-verified
        tenantId: defaultTenantId,
        role: Role.VENDEUR,
        status: 'active',
      });

      this.logger.log(`New user created via OAuth ${oauthData.provider}: ${user.id}`);

      // Send welcome email (non-blocking)
      this.emailService
        .sendOAuthWelcomeEmail(user.email, oauthData.provider)
        .catch(() => {});
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('Compte désactivé');
    }

    await this.usersService.updateLastLogin(user.id);

    const tokens = await this.generateTokens(user);
    const session = await this.sessionService.createSession(
      user.id,
      user.tenantId,
      tokens.refreshToken,
      meta,
    );

    await this.usersService.updateRefreshTokenHash(
      user.id,
      this.hashToken(tokens.refreshToken),
    );

    return {
      ...tokens,
      sessionId: session.id,
      isNewUser: !user.lastLogin,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        tenantId: user.tenantId,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        oauthProvider: user.oauthProvider,
      },
    };
  }

  // ==================== SESSIONS ====================

  async getSessions(userId: string) {
    return this.sessionService.getUserSessions(userId);
  }

  async revokeSession(userId: string, sessionId: string) {
    const revoked = await this.sessionService.revokeSession(sessionId, userId);
    if (!revoked) {
      throw new BadRequestException('Session non trouvée');
    }
    return { message: 'Session révoquée' };
  }

  async revokeOtherSessions(userId: string, currentSessionId: string) {
    const count = await this.sessionService.revokeOtherSessions(userId, currentSessionId);
    return { message: `${count} autre(s) session(s) révoquée(s)`, revokedCount: count };
  }

  // ==================== TOKEN GENERATION ====================

  private async generateTokens(user: any) {
    const accessToken = await this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user);
    return { accessToken, refreshToken };
  }

  private async generateAccessToken(user: any): Promise<string> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };

    return this.jwtService.signAsync(payload, {
      expiresIn: this.configService.get<number>('JWT_EXPIRES_IN', 3600) as any,
    });
  }

  private async generateRefreshToken(user: any): Promise<string> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      type: 'refresh',
    };

    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'dev-only-refresh-secret',
      expiresIn: this.configService.get<number>('JWT_REFRESH_EXPIRES_IN', 604800) as any,
    });
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
