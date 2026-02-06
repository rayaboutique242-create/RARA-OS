// src/monitoring/entities/error-log.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum ErrorLogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

@Entity('error_logs')
@Index(['level', 'createdAt'])
@Index(['tenantId', 'createdAt'])
@Index(['errorCode', 'createdAt'])
export class ErrorLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  tenantId: string;

  @Column({ type: 'varchar', length: 20 })
  level: ErrorLogLevel;

  @Column()
  message: string;

  @Column({ nullable: true })
  errorCode: string;

  @Column({ type: 'text', nullable: true })
  stackTrace: string;

  @Column({ nullable: true })
  source: string;

  @Column({ nullable: true })
  endpoint: string;

  @Column({ nullable: true })
  method: string;

  @Column({ nullable: true })
  userId: string;

  @Column({ nullable: true })
  userEmail: string;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ type: 'simple-json', nullable: true })
  requestBody: Record<string, any>;

  @Column({ type: 'simple-json', nullable: true })
  requestHeaders: Record<string, string>;

  @Column({ type: 'simple-json', nullable: true })
  context: Record<string, any>;

  @Column({ nullable: true })
  sentryEventId: string;

  @Column({ default: false })
  isResolved: boolean;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date;

  @Column({ nullable: true })
  resolvedBy: string;

  @Column({ type: 'text', nullable: true })
  resolution: string;

  @CreateDateColumn()
  @Index()
  createdAt: Date;
}
