// src/security/services/password.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { SecurityConfig } from '../entities/security-config.entity';
import { PasswordValidationResultDto } from '../dto/security.dto';

@Injectable()
export class PasswordService {
  constructor(
    @InjectRepository(SecurityConfig)
    private securityConfigRepo: Repository<SecurityConfig>,
  ) {}

  /**
   * Valide un mot de passe selon les règles de sécurité
   */
  async validatePassword(
    password: string,
    tenantId?: string,
  ): Promise<PasswordValidationResultDto> {
    const config = await this.getSecurityConfig(tenantId);
    const errors: string[] = [];

    // Longueur minimale
    if (password.length < config.minPasswordLength) {
      errors.push(`Le mot de passe doit contenir au moins ${config.minPasswordLength} caractères`);
    }

    // Majuscules
    if (config.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins une majuscule');
    }

    // Minuscules
    if (config.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins une minuscule');
    }

    // Chiffres
    if (config.requireNumbers && !/\d/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins un chiffre');
    }

    // Caractères spéciaux
    if (config.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins un caractère spécial');
    }

    // Patterns communs à éviter
    const commonPatterns = [
      /^123456/,
      /password/i,
      /qwerty/i,
      /abc123/i,
      /letmein/i,
      /welcome/i,
      /admin/i,
    ];
    
    for (const pattern of commonPatterns) {
      if (pattern.test(password)) {
        errors.push('Le mot de passe est trop commun ou prévisible');
        break;
      }
    }

    // Calcul du score de force
    const { strength, score } = this.calculatePasswordStrength(password);

    return {
      isValid: errors.length === 0,
      errors,
      strength,
      score,
    };
  }

  /**
   * Calcule la force du mot de passe
   */
  calculatePasswordStrength(password: string): { 
    strength: 'weak' | 'medium' | 'strong' | 'very_strong'; 
    score: number 
  } {
    let score = 0;

    // Longueur
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;

    // Diversité des caractères
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;

    // Complexité supplémentaire
    if (/[!@#$%^&*(),.?":{}|<>].*[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
    if (/\d.*\d.*\d/.test(password)) score += 1;

    // Pas de répétitions
    if (!/(.)\1{2,}/.test(password)) score += 1;

    let strength: 'weak' | 'medium' | 'strong' | 'very_strong';
    if (score <= 3) strength = 'weak';
    else if (score <= 5) strength = 'medium';
    else if (score <= 7) strength = 'strong';
    else strength = 'very_strong';

    return { strength, score };
  }

  /**
   * Hash un mot de passe
   */
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Compare un mot de passe avec son hash
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Génère un mot de passe aléatoire sécurisé
   */
  generateSecurePassword(length: number = 16): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*()';
    const all = uppercase + lowercase + numbers + special;

    let password = '';
    
    // Garantir au moins un de chaque type
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    // Remplir le reste
    for (let i = 4; i < length; i++) {
      password += all[Math.floor(Math.random() * all.length)];
    }

    // Mélanger
    return password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
  }

  /**
   * Vérifie si le mot de passe a expiré
   */
  async isPasswordExpired(
    lastPasswordChange: Date,
    tenantId?: string,
  ): Promise<boolean> {
    const config = await this.getSecurityConfig(tenantId);
    
    if (config.passwordExpirationDays === 0) {
      return false; // Pas d'expiration
    }

    const expirationDate = new Date(lastPasswordChange);
    expirationDate.setDate(expirationDate.getDate() + config.passwordExpirationDays);
    
    return new Date() > expirationDate;
  }

  /**
   * Récupère la configuration de sécurité du tenant
   */
  private async getSecurityConfig(tenantId?: string): Promise<SecurityConfig> {
    if (tenantId) {
      const config = await this.securityConfigRepo.findOne({
        where: { tenantId, isActive: true },
      });
      if (config) return config;
    }

    // Configuration par défaut
    return {
      id: 0,
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
      allowedIPs: null,
      blockedIPs: null,
      enforceIPWhitelist: false,
      requestsPerMinute: 100,
      requestsPerHour: 1000,
      logLoginAttempts: true,
      logPasswordChanges: true,
      logSecurityEvents: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as SecurityConfig;
  }
}
