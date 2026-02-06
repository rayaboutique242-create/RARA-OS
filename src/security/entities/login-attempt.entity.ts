// src/security/entities/login-attempt.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('login_attempts')
@Index(['ipAddress', 'createdAt'])
@Index(['email', 'createdAt'])
export class LoginAttempt {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Column({ type: 'varchar', length: 45 })
  ipAddress: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  userAgent: string;

  @Column({ type: 'boolean', default: false })
  successful: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  failureReason: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  tenantId: string;

  @Column({ type: 'varchar', length: 2, nullable: true })
  countryCode: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string;

  @CreateDateColumn()
  createdAt: Date;
}
