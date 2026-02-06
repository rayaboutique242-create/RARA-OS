// src/webhooks/entities/webhook-log.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Webhook } from './webhook.entity';

export enum DeliveryStatus {
  PENDING = 'PENDING',
  SENDING = 'SENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING',
}

@Entity('webhook_logs')
export class WebhookLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  tenantId: string | null;

  @Column({ type: 'integer' })
  webhookId: number;

  @ManyToOne(() => Webhook, (webhook) => webhook.logs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'webhookId' })
  webhook: Webhook;

  @Column({ type: 'varchar', length: 50 })
  event: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  eventId: string;

  @Column({ type: 'text', nullable: true })
  payload: string;

  @Column({ type: 'varchar', length: 20, default: DeliveryStatus.PENDING })
  status: DeliveryStatus;

  @Column({ type: 'integer', default: 0 })
  attemptCount: number;

  @Column({ type: 'integer', nullable: true })
  responseStatus: number;

  @Column({ type: 'text', nullable: true })
  responseBody: string;

  @Column({ type: 'text', nullable: true })
  responseHeaders: string;

  @Column({ type: 'integer', nullable: true })
  responseTimeMs: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  errorMessage: string | null;

  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  nextRetryAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  // Helpers
  getPayload(): any {
    return this.payload ? JSON.parse(this.payload) : null;
  }

  setPayload(payload: any): void {
    this.payload = JSON.stringify(payload);
  }
}

