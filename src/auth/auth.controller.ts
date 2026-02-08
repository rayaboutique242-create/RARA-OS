// src/auth/auth.controller.ts
import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Res,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SendOtpDto, VerifyOtpDto } from './dto/otp.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { GithubAuthGuard } from './guards/github-auth.guard';
import { Public } from './decorators/public.decorator';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private otpService: OtpService,
    private configService: ConfigService,
  ) {}

  // ==================== LOGIN / REGISTER ====================

  @Post('login')
  @Public()
  @Throttle({ default: { ttl: 900000, limit: 20 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Connexion utilisateur',
    description: 'Authentifie par email/mot de passe. Retourne access + refresh tokens et un sessionId.',
  })
  @ApiResponse({ status: 200, description: 'Connexion réussie (tokens + user + sessionId)' })
  @ApiResponse({ status: 401, description: 'Identifiants invalides' })
  @ApiResponse({ status: 403, description: 'Compte verrouillé' })
  async login(@Body() loginDto: LoginDto, @Request() req) {
    return this.authService.login(loginDto, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('register')
  @Public()
  @Throttle({ default: { ttl: 900000, limit: 10 } })
  @ApiOperation({
    summary: 'Inscription utilisateur',
    description: 'Crée un nouveau compte. Retourne tokens + sessionId.',
  })
  @ApiResponse({ status: 201, description: 'Inscription réussie' })
  @ApiResponse({ status: 400, description: 'Email déjà utilisé' })
  async register(@Body() registerDto: RegisterDto, @Request() req) {
    return this.authService.register(registerDto, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  // ==================== ACTIVATION CODE ====================

  @Post('activate')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Vérifier le code d\'activation',
    description: 'Vérifie si le code d\'activation est valide pour débloquer l\'accès à l\'application.',
  })
  @ApiBody({ 
    schema: { 
      properties: { 
        code: { type: 'string', example: 'RAYA2026', description: 'Code d\'activation fourni' } 
      },
      required: ['code']
    } 
  })
  @ApiResponse({ status: 200, description: 'Code valide' })
  @ApiResponse({ status: 400, description: 'Code invalide' })
  async verifyActivationCode(@Body('code') code: string) {
    const validCode = this.configService.get<string>('APP_ACTIVATION_CODE', 'RAYA2026');
    const isValid = code && code.toUpperCase().trim() === validCode.toUpperCase().trim();
    
    if (!isValid) {
      return {
        valid: false,
        message: 'Code d\'activation invalide',
      };
    }
    
    return {
      valid: true,
      message: 'Code d\'activation valide. Bienvenue sur Raya !',
    };
  }

  // ==================== BOOTSTRAP (First tenant + admin) ====================

  @Post('bootstrap')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Bootstrap: Créer le premier tenant et admin',
    description: 'Permet de créer le premier tenant et utilisateur admin avec le code d\'activation. Usage unique pour le premier déploiement.',
  })
  @ApiBody({ 
    schema: { 
      properties: { 
        activationCode: { type: 'string', example: 'RAYA2026', description: 'Code d\'activation' },
        tenantName: { type: 'string', example: 'Mon Entreprise', description: 'Nom de l\'entreprise' },
        tenantCode: { type: 'string', example: 'MYCOMPANY', description: 'Code unique du tenant (optionnel)' },
        email: { type: 'string', example: 'admin@example.com', description: 'Email de l\'admin' },
        password: { type: 'string', example: 'SecurePass123!', description: 'Mot de passe' },
        firstName: { type: 'string', example: 'John', description: 'Prénom' },
        lastName: { type: 'string', example: 'Doe', description: 'Nom' },
        currency: { type: 'string', example: 'XOF', default: 'XOF' },
        timezone: { type: 'string', example: 'Africa/Abidjan', default: 'Africa/Abidjan' },
      },
      required: ['activationCode', 'tenantName', 'email', 'password']
    } 
  })
  @ApiResponse({ status: 201, description: 'Tenant et admin créés avec succès' })
  @ApiResponse({ status: 400, description: 'Code invalide ou données manquantes' })
  @ApiResponse({ status: 409, description: 'Un tenant existe déjà' })
  async bootstrap(@Body() body: {
    activationCode: string;
    tenantName: string;
    tenantCode?: string;
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    currency?: string;
    timezone?: string;
  }, @Request() req) {
    return this.authService.bootstrap(body, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  // ==================== PROFILE ====================

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Profil utilisateur',
    description: 'Retourne les infos de l\'utilisateur connecté.',
  })
  @ApiResponse({ status: 200, description: 'Profil utilisateur' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async getMe(@Request() req) {
    return this.authService.getProfile(req.user.id);
  }

  // ==================== REFRESH TOKEN ====================

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rafraîchir les tokens (rotation)',
    description: 'Fournit un refresh token et reçoit un nouveau access + refresh token. L\'ancien refresh token est invalidé.',
  })
  @ApiBody({ schema: { properties: { refreshToken: { type: 'string' } } } })
  @ApiResponse({ status: 200, description: 'Nouveaux accessToken + refreshToken' })
  @ApiResponse({ status: 401, description: 'Token invalide ou réutilisé' })
  async refresh(@Body('refreshToken') refreshToken: string, @Request() req) {
    return this.authService.refreshToken(refreshToken, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  // ==================== LOGOUT ====================

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Déconnexion',
    description: 'Révoque la session courante et invalide le refresh token.',
  })
  @ApiBody({ schema: { properties: { sessionId: { type: 'string' } } }, required: false })
  @ApiResponse({ status: 200, description: 'Déconnexion réussie' })
  async logout(@Request() req, @Body('sessionId') sessionId?: string) {
    return this.authService.logout(req.user.id, sessionId);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Déconnexion de tous les appareils',
    description: 'Révoque toutes les sessions actives de l\'utilisateur.',
  })
  @ApiResponse({ status: 200, description: 'Toutes les sessions révoquées' })
  async logoutAll(@Request() req) {
    return this.authService.logoutAll(req.user.id);
  }

  // ==================== PASSWORD RESET ====================

  @Post('forgot-password')
  @Public()
  @Throttle({ default: { ttl: 900000, limit: 3 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Demande de réinitialisation de mot de passe',
    description: 'Envoie un email avec un lien de réinitialisation. Retourne toujours succès (sécurité).',
  })
  @ApiResponse({ status: 200, description: 'Email envoyé (si le compte existe)' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Réinitialiser le mot de passe',
    description: 'Utilise le token reçu par email pour définir un nouveau mot de passe. Toutes les sessions sont révoquées.',
  })
  @ApiResponse({ status: 200, description: 'Mot de passe réinitialisé' })
  @ApiResponse({ status: 400, description: 'Token invalide ou expiré' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Changer le mot de passe (utilisateur connecté)',
    description: 'Nécessite le mot de passe actuel. Le nouveau doit contenir min 8 chars, 1 majuscule, 1 chiffre.',
  })
  @ApiResponse({ status: 200, description: 'Mot de passe modifié' })
  @ApiResponse({ status: 400, description: 'Mot de passe actuel incorrect ou nouveau mot de passe invalide' })
  async changePassword(@Request() req, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.id, dto);
  }

  // ==================== SESSIONS ====================

  @Get('sessions')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lister les sessions actives',
    description: 'Retourne toutes les sessions actives avec appareil, IP, dernière activité.',
  })
  @ApiResponse({ status: 200, description: 'Liste des sessions actives' })
  async getSessions(@Request() req) {
    return this.authService.getSessions(req.user.id);
  }

  @Delete('sessions/:sessionId')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Révoquer une session spécifique',
    description: 'Déconnecte un appareil spécifique.',
  })
  @ApiResponse({ status: 200, description: 'Session révoquée' })
  @ApiResponse({ status: 400, description: 'Session non trouvée' })
  async revokeSession(@Request() req, @Param('sessionId') sessionId: string) {
    return this.authService.revokeSession(req.user.id, sessionId);
  }

  @Post('sessions/revoke-others')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Révoquer toutes les autres sessions',
    description: 'Garde uniquement la session courante, déconnecte tous les autres appareils.',
  })
  @ApiBody({ schema: { properties: { currentSessionId: { type: 'string' } } } })
  @ApiResponse({ status: 200, description: 'Autres sessions révoquées' })
  async revokeOtherSessions(@Request() req, @Body('currentSessionId') currentSessionId: string) {
    return this.authService.revokeOtherSessions(req.user.id, currentSessionId);
  }

  // ==================== OAUTH2: GOOGLE ====================

  @Get('google')
  @Public()
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({
    summary: 'Connexion via Google',
    description: 'Redirige vers la page de connexion Google OAuth2.',
  })
  @ApiResponse({ status: 302, description: 'Redirection vers Google' })
  @ApiResponse({ status: 501, description: 'Google OAuth non configuré' })
  async googleAuth() {
    // Guard handles the redirect
  }

  @Get('google/callback')
  @Public()
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({
    summary: 'Callback Google OAuth2',
    description: 'Endpoint appelé par Google après authentification. Redirige vers le frontend avec les tokens.',
  })
  async googleCallback(@Request() req, @Res() res: Response) {
    const result = await this.authService.handleOAuthLogin(req.user, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:4200');
    const params = new URLSearchParams({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      sessionId: result.sessionId,
    });

    res.redirect(`${frontendUrl}/auth/oauth-callback?${params.toString()}`);
  }

  // ==================== OAUTH2: GITHUB ====================

  @Get('github')
  @Public()
  @UseGuards(GithubAuthGuard)
  @ApiOperation({
    summary: 'Connexion via GitHub',
    description: 'Redirige vers la page de connexion GitHub OAuth2.',
  })
  @ApiResponse({ status: 302, description: 'Redirection vers GitHub' })
  @ApiResponse({ status: 501, description: 'GitHub OAuth non configuré' })
  async githubAuth() {
    // Guard handles the redirect
  }

  @Get('github/callback')
  @Public()
  @UseGuards(GithubAuthGuard)
  @ApiOperation({
    summary: 'Callback GitHub OAuth2',
    description: 'Endpoint appelé par GitHub après authentification. Redirige vers le frontend avec les tokens.',
  })
  async githubCallback(@Request() req, @Res() res: Response) {
    const result = await this.authService.handleOAuthLogin(req.user, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:4200');
    const params = new URLSearchParams({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      sessionId: result.sessionId,
    });

    res.redirect(`${frontendUrl}/auth/oauth-callback?${params.toString()}`);
  }

  // ==================== OTP ENDPOINTS ====================

  @Post('otp/send')
  @Public()
  @Throttle({ default: { ttl: 900000, limit: 3 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Envoyer un code OTP',
    description: 'Envoie un code OTP à 6 chiffres. En mode dev, le code est retourné dans la réponse.',
  })
  @ApiBody({ type: SendOtpDto })
  @ApiResponse({ status: 200, description: 'OTP envoyé' })
  @ApiResponse({ status: 400, description: 'Contact invalide ou trop de demandes' })
  async sendOtp(@Body() dto: SendOtpDto) {
    return this.otpService.sendOtp(dto.contact);
  }

  @Post('otp/verify')
  @Public()
  @Throttle({ default: { ttl: 900000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Vérifier un code OTP',
    description: 'Vérifie le code OTP saisi. Maximum 3 tentatives.',
  })
  @ApiBody({ type: VerifyOtpDto })
  @ApiResponse({ status: 200, description: 'OTP valide' })
  @ApiResponse({ status: 400, description: 'Code invalide, expiré ou trop de tentatives' })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.otpService.verifyOtp(dto.contact, dto.code);
  }
}
