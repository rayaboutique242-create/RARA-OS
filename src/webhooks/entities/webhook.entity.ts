// src/webhooks/entities/webhook.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { WebhookLog } from './webhook-log.entity';

export enum WebhookEvent {
  // Orders
  ORDER_CREATED = 'order.created',
  ORDER_UPDATED = 'order.updated',
  ORDER_COMPLETED = 'order.completed',
  ORDER_CANCELLED = 'order.cancelled',
  ORDER_PAID = 'order.paid',
  
  // Products
  PRODUCT_CREATED = 'product.created',
  PRODUCT_UPDATED = 'product.updated',
  PRODUCT_DELETED = 'product.deleted',
  
  // Inventory
  STOCK_LOW = 'stock.low',
  STOCK_OUT = 'stock.out',
  STOCK_UPDATED = 'stock.updated',
  
  // Customers
  CUSTOMER_CREATED = 'customer.created',
  CUSTOMER_UPDATED = 'customer.updated',
  
  // Payments
  PAYMENT_RECEIVED = 'payment.received',
  PAYMENT_FAILED = 'payment.failed',
  PAYMENT_REFUNDED = 'payment.refunded',
  
  // Suppliers
  PURCHASE_ORDER_CREATED = 'purchase_order.created',
  PURCHASE_ORDER_RECEIVED = 'purchase_order.received',
  
  // Promotions
  PROMOTION_STARTED = 'promotion.started',
  PROMOTION_ENDED = 'promotion.ended',
  
  // System
  BACKUP_COMPLETED = 'backup.completed',
  REPORT_GENERATED = 'report.generated',
}

export enum WebhookStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

@Entity('webhooks')
export class Webhook {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  tenantId: string | null;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 500 })
  url: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  secret: string;

  @Column({ type: 'text', nullable: true })
  events: string; // JSON array of WebhookEvent

  @Column({ type: 'varchar', length: 20, default: WebhookStatus.ACTIVE })
  status: WebhookStatus;

  @Column({ type: 'text', nullable: true })
  headers: string; // JSON object of custom headers

  @Column({ type: 'integer', default: 3 })
  maxRetries: number;

  @Column({ type: 'integer', default: 30 })
  timeoutSeconds: number;

  @Column({ type: 'boolean', default: true })
  verifySSL: boolean;

  @Column({ type: 'integer', default: 0 })
  totalDeliveries: number;

  @Column({ type: 'integer', default: 0 })
  successfulDeliveries: number;

  @Column({ type: 'integer', default: 0 })
  failedDeliveries: number;

  @Column({ type: 'integer', default: 0 })
  consecutiveFailures: number;

  @Column({ type: 'datetime', nullable: true })
  lastTriggeredAt: Date;

  @Column({ type: 'datetime', nullable: true })
  lastSuccessAt: Date;

  @Column({ type: 'datetime', nullable: true })
  lastFailureAt: Date;

  @Column({ type: 'varchar', length: 500, nullable: true })
  lastErrorMessage: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  createdBy: string;

  @OneToMany(() => WebhookLog, (log) => log.webhook)
  logs: WebhookLog[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helpers
  getEvents(): WebhookEvent[] {
    return this.events ? JSON.parse(this.events) : [];
  }

  setEvents(events: WebhookEvent[]): void {
    this.events = JSON.stringify(events);
  }

  getHeaders(): Record<string, string> {
    return this.headers ? JSON.parse(this.headers) : {};
  }

  setHeaders(headers: Record<string, string>): void {
    this.headers = JSON.stringify(headers);
  }
}

