// src/security/services/security.service.ts
import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan } from 'typeorm';
import { LoginAttempt } from '../entities/login-attempt.entity';
import { BlockedIp, BlockReason } from '../entities/blocked-ip.entity';
import { SecurityConfig } from '../entities/security-config.entity';
import { UserTwoFactor } from '../entities/user-two-factor.entity';
import { BlockIpDto, UpdateSecurityConfigDto, SecurityDashboardDto } from '../dto/security.dto';

@Injectable()
export class SecurityService {
  constructor(
    @InjectRepository(LoginAttempt)
    private loginAttemptRepo: Repository<LoginAttempt>,
    @InjectRepository(BlockedIp)
    private blockedIpRepo: Repository<BlockedIp>,
    @InjectRepository(SecurityConfig)
    private securityConfigRepo: Repository<SecurityConfig>,
    @InjectRepository(UserTwoFactor)
    private userTwoFactorRepo: Repository<UserTwoFactor>,
  ) {}

  // ==================== Login Attempts ====================

  /**
   * Enregistre une tentative de connexion
   */
  async recordLoginAttempt(data: {
    email?: string;
    ipAddress: string;
    userAgent?: string;
    successful: boolean;
    failureReason?: string;
    tenantId?: string;
  }): Promise<LoginAttempt> {
    const attempt = this.loginAttemptRepo.create({
      email: data.email,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      successful: data.successful,
      failureReason: data.failureReason,
      tenantId: data.tenantId,
    });

    return this.loginAttemptRepo.save(attempt);
  }

  /**
   * Vérifie si l'IP est bloquée (brute force)
   */
  async checkBruteForce(
    ipAddress: string,
    email?: string,
    tenantId?: string,
  ): Promise<{ isBlocked: boolean; remainingAttempts: number; lockoutUntil?: Date }> {
    // Vérifier si l'IP est dans la liste noire
    const blockedIp = await this.blockedIpRepo.findOne({
      where: { ipAddress, isActive: true },
    });

    if (blockedIp) {
      if (blockedIp.isPermanent) {
        throw new ForbiddenException('Votre adresse IP a été bloquée définitivement');
      }

      if (blockedIp.expiresAt && blockedIp.expiresAt > new Date()) {
        throw new ForbiddenException(
          `Votre adresse IP est temporairement bloquée jusqu'à ${blockedIp.expiresAt.toLocaleString()}`,
        );
      }

      // Le blocage a expiré, le désactiver
      await this.blockedIpRepo.update(blockedIp.id, { isActive: false });
    }

    // Récupérer la configuration
    const config = await this.getSecurityConfig(tenantId);

    // Compter les échecs récents
    const windowStart = new Date();
    windowStart.setMinutes(windowStart.getMinutes() - config.attemptWindowMinutes);

    const failedAttempts = await this.loginAttemptRepo.count({
      where: {
        ipAddress,
        successful: false,
        createdAt: MoreThan(windowStart),
      },
    });

    const remainingAttempts = config.maxLoginAttempts - failedAttempts;

    if (failedAttempts >= config.maxLoginAttempts) {
      // Bloquer l'IP
      const lockoutUntil = new Date();
      lockoutUntil.setMinutes(lockoutUntil.getMinutes() + config.lockoutDurationMinutes);

      await this.blockIp({
        ipAddress,
        reason: BlockReason.BRUTE_FORCE,
        description: `Trop de tentatives de connexion échouées (${failedAttempts})`,
        isPermanent: false,
        durationHours: config.lockoutDurationMinutes / 60,
      }, tenantId);

      return {
        isBlocked: true,
        remainingAttempts: 0,
        lockoutUntil,
      };
    }

    return {
      isBlocked: false,
      remainingAttempts: Math.max(0, remainingAttempts),
    };
  }

  /**
   * Récupère les tentatives de connexion récentes
   */
  async getLoginAttempts(
    filters: {
      email?: string;
      ipAddress?: string;
      successful?: boolean;
      tenantId?: string;
      startDate?: Date;
      endDate?: Date;
    },
    page: number = 1,
    limit: number = 50,
  ): Promise<{ data: LoginAttempt[]; total: number }> {
    const queryBuilder = this.loginAttemptRepo.createQueryBuilder('attempt');

    if (filters.email) {
      queryBuilder.andWhere('attempt.email = :email', { email: filters.email });
    }

    if (filters.ipAddress) {
      queryBuilder.andWhere('attempt.ipAddress = :ipAddress', { ipAddress: filters.ipAddress });
    }

    if (filters.successful !== undefined) {
      queryBuilder.andWhere('attempt.successful = :successful', { successful: filters.successful });
    }

    if (filters.tenantId) {
      queryBuilder.andWhere('attempt.tenantId = :tenantId', { tenantId: filters.tenantId });
    }

    if (filters.startDate) {
      queryBuilder.andWhere('attempt.createdAt >= :startDate', { startDate: filters.startDate });
    }

    if (filters.endDate) {
      queryBuilder.andWhere('attempt.createdAt <= :endDate', { endDate: filters.endDate });
    }

    const [data, total] = await queryBuilder
      .orderBy('attempt.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  // ==================== IP Blocking ====================

  /**
   * Bloque une adresse IP
   */
  async blockIp(dto: BlockIpDto, tenantId?: string, blockedBy?: string): Promise<BlockedIp> {
    const existing = await this.blockedIpRepo.findOne({
      where: { ipAddress: dto.ipAddress },
    });

    let expiresAt: Date | undefined;
    if (!dto.isPermanent && dto.durationHours) {
      expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + dto.durationHours);
    }

    if (existing) {
      await this.blockedIpRepo.update(existing.id, {
        reason: dto.reason,
        description: dto.description,
        isPermanent: dto.isPermanent || false,
        expiresAt: expiresAt,
        isActive: true,
        attemptCount: existing.attemptCount + 1,
        blockedBy,
        tenantId,
      });
      return this.blockedIpRepo.findOneOrFail({ where: { id: existing.id } });
    }

    const blocked = this.blockedIpRepo.create({
      ipAddress: dto.ipAddress,
      reason: dto.reason,
      description: dto.description,
      isPermanent: dto.isPermanent || false,
      expiresAt: expiresAt,
      isActive: true,
      attemptCount: 1,
      blockedBy,
      tenantId,
    });

    return this.blockedIpRepo.save(blocked);
  }

  /**
   * Débloque une adresse IP
   */
  async unblockIp(ipAddress: string): Promise<{ success: boolean; message: string }> {
    const blocked = await this.blockedIpRepo.findOne({
      where: { ipAddress, isActive: true },
    });

    if (!blocked) {
      return { success: false, message: 'Cette IP n\'est pas bloquée' };
    }

    await this.blockedIpRepo.update(blocked.id, { isActive: false });

    return { success: true, message: 'IP débloquée avec succès' };
  }

  /**
   * Liste les IPs bloquées
   */
  async getBlockedIps(
    activeOnly: boolean = true,
    page: number = 1,
    limit: number = 50,
  ): Promise<{ data: BlockedIp[]; total: number }> {
    const queryBuilder = this.blockedIpRepo.createQueryBuilder('blocked');

    if (activeOnly) {
      queryBuilder.where('blocked.isActive = :isActive', { isActive: true });
    }

    const [data, total] = await queryBuilder
      .orderBy('blocked.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  /**
   * Vérifie si une IP est bloquée
   */
  async isIpBlocked(ipAddress: string): Promise<boolean> {
    const blocked = await this.blockedIpRepo.findOne({
      where: { ipAddress, isActive: true },
    });

    if (!blocked) return false;

    if (blocked.isPermanent) return true;

    if (blocked.expiresAt && blocked.expiresAt > new Date()) {
      return true;
    }

    // Expiration passée, désactiver
    await this.blockedIpRepo.update(blocked.id, { isActive: false });
    return false;
  }

  // ==================== Security Config ====================

  /**
   * Récupère la configuration de sécurité
   */
  async getSecurityConfig(tenantId?: string): Promise<SecurityConfig> {
    if (tenantId) {
      const config = await this.securityConfigRepo.findOne({
        where: { tenantId, isActive: true },
      });
      if (config) return config;
    }

    // Configuration par défaut
    let defaultConfig = await this.securityConfigRepo.findOne({
      where: { tenantId: 'default' },
    });

    if (!defaultConfig) {
      defaultConfig = await this.initializeDefaultConfig();
    }

    return defaultConfig;
  }

  /**
   * Met à jour la configuration de sécurité
   */
  async updateSecurityConfig(
    tenantId: string,
    dto: UpdateSecurityConfigDto,
  ): Promise<SecurityConfig> {
    let config = await this.securityConfigRepo.findOne({
      where: { tenantId },
    });

    if (!config) {
      config = this.securityConfigRepo.create({
        tenantId,
        ...dto,
      });
    } else {
      Object.assign(config, dto);
    }

    return this.securityConfigRepo.save(config);
  }

  /**
   * Initialise la configuration par défaut
   */
  async initializeDefaultConfig(): Promise<SecurityConfig> {
    const existing = await this.securityConfigRepo.findOne({
      where: { tenantId: 'default' },
    });

    if (existing) return existing;

    const config = this.securityConfigRepo.create({
      tenantId: 'default',
      minPasswordLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      passwordExpirationDays: 90,
      passwordHistoryCount: 5,
      maxLoginAttempts: 5,
      lockoutDurationMinutes: 15,
      attemptWindowMinutes: 30,
      sessionTimeoutMinutes: 60,
      maxConcurrentSessions: 3,
      enforceSessionExpiry: true,
      require2FA: false,
      allow2FARememberDevice: true,
      remember2FADays: 30,
      enforceIPWhitelist: false,
      requestsPerMinute: 100,
      requestsPerHour: 1000,
      logLoginAttempts: true,
      logPasswordChanges: true,
      logSecurityEvents: true,
      isActive: true,
    });

    return this.securityConfigRepo.save(config);
  }

  // ==================== Dashboard ====================

  /**
   * Récupère le tableau de bord de sécurité
   */
  async getSecurityDashboard(tenantId?: string): Promise<SecurityDashboardDto> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Tentatives de connexion aujourd'hui
    const [loginAttemptsToday, failedLoginAttemptsToday] = await Promise.all([
      this.loginAttemptRepo.count({
        where: { createdAt: MoreThan(today) },
      }),
      this.loginAttemptRepo.count({
        where: { createdAt: MoreThan(today), successful: false },
      }),
    ]);

    // IPs bloquées
    const blockedIpsCount = await this.blockedIpRepo.count({
      where: { isActive: true },
    });

    // Utilisateurs avec 2FA
    const users2FAEnabled = await this.userTwoFactorRepo.count({
      where: { isEnabled: true },
    });

    // Événements récents
    const recentSecurityEvents = await this.loginAttemptRepo.find({
      where: { successful: false },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    // Top IPs bloquées
    const topBlockedIps = await this.blockedIpRepo.find({
      where: { isActive: true },
      order: { attemptCount: 'DESC' },
      take: 5,
    });

    return {
      loginAttemptsToday,
      failedLoginAttemptsToday,
      blockedIpsCount,
      users2FAEnabled,
      recentSecurityEvents,
      topBlockedIps,
    };
  }

  // ==================== Cleanup ====================

  /**
   * Nettoie les anciennes tentatives de connexion
   */
  async cleanupOldAttempts(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.loginAttemptRepo.delete({
      createdAt: LessThan(cutoffDate),
    });

    return result.affected || 0;
  }

  /**
   * Nettoie les blocages expirés
   */
  async cleanupExpiredBlocks(): Promise<number> {
    const result = await this.blockedIpRepo.update(
      {
        isActive: true,
        isPermanent: false,
        expiresAt: LessThan(new Date()),
      },
      { isActive: false },
    );

    return result.affected || 0;
  }
}
