// src/security/entities/security-config.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('security_configs')
export class SecurityConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  tenantId: string;

  // Password Policy
  @Column({ type: 'int', default: 8 })
  minPasswordLength: number;

  @Column({ type: 'boolean', default: true })
  requireUppercase: boolean;

  @Column({ type: 'boolean', default: true })
  requireLowercase: boolean;

  @Column({ type: 'boolean', default: true })
  requireNumbers: boolean;

  @Column({ type: 'boolean', default: true })
  requireSpecialChars: boolean;

  @Column({ type: 'int', default: 90 })
  passwordExpirationDays: number;

  @Column({ type: 'int', default: 5 })
  passwordHistoryCount: number;

  // Brute Force Protection
  @Column({ type: 'int', default: 5 })
  maxLoginAttempts: number;

  @Column({ type: 'int', default: 15 })
  lockoutDurationMinutes: number;

  @Column({ type: 'int', default: 30 })
  attemptWindowMinutes: number;

  // Session Management
  @Column({ type: 'int', default: 60 })
  sessionTimeoutMinutes: number;

  @Column({ type: 'int', default: 3 })
  maxConcurrentSessions: number;

  @Column({ type: 'boolean', default: true })
  enforceSessionExpiry: boolean;

  // 2FA Settings
  @Column({ type: 'boolean', default: false })
  require2FA: boolean;

  @Column({ type: 'boolean', default: true })
  allow2FARememberDevice: boolean;

  @Column({ type: 'int', default: 30 })
  remember2FADays: number;

  // IP Restrictions
  @Column({ type: 'text', nullable: true })
  allowedIPs: string | null; // JSON array

  @Column({ type: 'text', nullable: true })
  blockedIPs: string | null; // JSON array

  @Column({ type: 'boolean', default: false })
  enforceIPWhitelist: boolean;

  // Rate Limiting
  @Column({ type: 'int', default: 100 })
  requestsPerMinute: number;

  @Column({ type: 'int', default: 1000 })
  requestsPerHour: number;

  // Audit Settings
  @Column({ type: 'boolean', default: true })
  logLoginAttempts: boolean;

  @Column({ type: 'boolean', default: true })
  logPasswordChanges: boolean;

  @Column({ type: 'boolean', default: true })
  logSecurityEvents: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
