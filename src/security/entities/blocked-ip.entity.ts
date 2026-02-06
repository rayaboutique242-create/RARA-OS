// src/security/entities/blocked-ip.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum BlockReason {
  BRUTE_FORCE = 'BRUTE_FORCE',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  MANUAL = 'MANUAL',
  DDOS = 'DDOS',
  SPAM = 'SPAM',
}

@Entity('blocked_ips')
@Index(['ipAddress'])
@Index(['expiresAt'])
export class BlockedIp {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 45, unique: true })
  ipAddress: string;

  @Column({ type: 'varchar', length: 50 })
  reason: BlockReason;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'int', default: 0 })
  attemptCount: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isPermanent: boolean;

  @Column({ type: 'datetime', nullable: true })
  expiresAt: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  blockedBy: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  tenantId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
