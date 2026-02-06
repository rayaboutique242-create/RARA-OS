// src/audit/entities/audit-log.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum AuditActionType {
  CREATE = 'CREATE', UPDATE = 'UPDATE', DELETE = 'DELETE', LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT', VIEW = 'VIEW', EXPORT = 'EXPORT', IMPORT = 'IMPORT',
  APPROVE = 'APPROVE', REJECT = 'REJECT', CANCEL = 'CANCEL', RESTORE = 'RESTORE',
}

export enum AuditModuleType {
  AUTH = 'AUTH', USERS = 'USERS', PRODUCTS = 'PRODUCTS', ORDERS = 'ORDERS',
  CATEGORIES = 'CATEGORIES', CUSTOMERS = 'CUSTOMERS', DELIVERIES = 'DELIVERIES',
  INVENTORY = 'INVENTORY', SUPPLIERS = 'SUPPLIERS', PAYMENTS = 'PAYMENTS',
  PROMOTIONS = 'PROMOTIONS', SETTINGS = 'SETTINGS', NOTIFICATIONS = 'NOTIFICATIONS', REPORTS = 'REPORTS',
}

@Entity('audit_logs')
@Index(['tenantId', 'createdAt'])
@Index(['userId', 'createdAt'])
@Index(['module', 'action'])
@Index(['entityType', 'entityId'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  @Index()
  tenantId: string;

  @Column({ type: 'uuid', nullable: true })
  userId?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({ type: 'varchar', length: 100, nullable: true })
  username?: string;

  @Column({ type: 'varchar', length: 50 })
  action: string;

  @Column({ type: 'varchar', length: 50 })
  module: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  entityType?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  entityId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  entityName?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'text', nullable: true })
  oldValues?: string;

  @Column({ type: 'text', nullable: true })
  newValues?: string;

  @Column({ type: 'text', nullable: true })
  changes?: string;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress?: string;

  @Column({ type: 'text', nullable: true })
  userAgent?: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  httpMethod?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  endpoint?: string;

  @Column({ type: 'integer', nullable: true })
  statusCode?: number;

  @Column({ type: 'integer', nullable: true })
  responseTime?: number;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ type: 'text', nullable: true })
  metadata?: string;

  @CreateDateColumn()
  @Index()
  createdAt: Date;
}
