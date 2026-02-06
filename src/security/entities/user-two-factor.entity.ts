// src/security/entities/user-two-factor.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum TwoFactorMethod {
  TOTP = 'TOTP',
  SMS = 'SMS',
  EMAIL = 'EMAIL',
}

@Entity('user_two_factors')
@Index(['userId'])
export class UserTwoFactor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  userId: string;

  @Column({ type: 'varchar', length: 50, default: TwoFactorMethod.TOTP })
  method: TwoFactorMethod;

  @Column({ type: 'varchar', length: 500, nullable: true })
  secret: string | null;

  @Column({ type: 'boolean', default: false })
  isEnabled: boolean;

  @Column({ type: 'boolean', default: false })
  isVerified: boolean;

  @Column({ type: 'text', nullable: true })
  recoveryCodes: string | null;

  @Column({ type: 'int', default: 0 })
  recoveryCodesUsed: number;

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  backupPhone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  backupEmail: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  tenantId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
