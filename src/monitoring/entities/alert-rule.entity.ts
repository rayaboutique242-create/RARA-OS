// src/monitoring/entities/alert-rule.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export enum AlertChannel {
  EMAIL = 'email',
  WEBHOOK = 'webhook',
  SLACK = 'slack',
  DISCORD = 'discord',
}

export enum AlertMetricType {
  ERROR_RATE = 'error_rate',
  RESPONSE_TIME = 'response_time',
  CPU_USAGE = 'cpu_usage',
  MEMORY_USAGE = 'memory_usage',
  DISK_USAGE = 'disk_usage',
  REQUEST_COUNT = 'request_count',
  DATABASE_CONNECTIONS = 'database_connections',
  CUSTOM = 'custom',
}

@Entity('alert_rules')
export class AlertRule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  tenantId: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 50 })
  metricType: AlertMetricType;

  @Column({ type: 'varchar', length: 20 })
  severity: AlertSeverity;

  @Column({ type: 'varchar', length: 20 })
  channel: AlertChannel;

  @Column({ type: 'float' })
  threshold: number;

  @Column({ type: 'varchar', length: 20, default: 'gt' })
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';

  @Column({ type: 'int', default: 60 })
  windowSeconds: number;

  @Column({ type: 'int', default: 300 })
  cooldownSeconds: number;

  @Column({ type: 'simple-json', nullable: true })
  channelConfig: {
    email?: string[];
    webhookUrl?: string;
    slackWebhook?: string;
    discordWebhook?: string;
  };

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastTriggeredAt: Date;

  @Column({ type: 'int', default: 0 })
  triggerCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
