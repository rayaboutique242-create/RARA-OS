// src/tenants/entities/tenant-subscription.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('tenant_subscriptions')
@Index(['tenantId'])
@Index(['status'])
export class TenantSubscription {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  subscriptionNumber: string;

  @Column({ type: 'varchar', length: 50 })
  tenantId: string;

  @Column({ type: 'varchar', length: 50 })
  plan: string;

  @Column({ type: 'varchar', length: 50, default: 'PENDING' })
  status: string;

  @Column({ type: 'datetime' })
  startDate: Date;

  @Column({ type: 'datetime' })
  endDate: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  monthlyPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  yearlyPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalPrice: number;

  @Column({ type: 'varchar', length: 20, default: 'MONTHLY' })
  billingCycle: string;

  @Column({ type: 'varchar', length: 10, default: 'XOF' })
  currency: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  paymentMethod: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  paymentReference: string;

  @Column({ type: 'datetime', nullable: true })
  paidAt: Date;

  @Column({ type: 'integer', default: 5 })
  maxUsers: number;

  @Column({ type: 'integer', default: 100 })
  maxProducts: number;

  @Column({ type: 'integer', default: 1 })
  maxStores: number;

  @Column({ type: 'integer', default: 1000 })
  maxOrdersPerMonth: number;

  @Column({ type: 'boolean', default: true })
  autoRenew: boolean;

  @Column({ type: 'datetime', nullable: true })
  cancelledAt: Date;

  @Column({ type: 'text', nullable: true })
  cancellationReason: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
