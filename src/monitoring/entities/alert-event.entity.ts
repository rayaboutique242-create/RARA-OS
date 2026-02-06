// src/monitoring/entities/alert-event.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AlertRule, AlertSeverity } from './alert-rule.entity';

export enum AlertStatus {
  TRIGGERED = 'triggered',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
}

@Entity('alert_events')
export class AlertEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  tenantId: string;

  @Column()
  ruleId: number;

  @ManyToOne(() => AlertRule, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ruleId' })
  rule: AlertRule;

  @Column({ type: 'varchar', length: 20 })
  severity: AlertSeverity;

  @Column({ type: 'varchar', length: 20, default: AlertStatus.TRIGGERED })
  status: AlertStatus;

  @Column()
  message: string;

  @Column({ type: 'float' })
  currentValue: number;

  @Column({ type: 'float' })
  thresholdValue: number;

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'timestamp', nullable: true })
  acknowledgedAt: Date;

  @Column({ nullable: true })
  acknowledgedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date;

  @Column({ nullable: true })
  resolvedBy: string;

  @CreateDateColumn()
  triggeredAt: Date;
}
