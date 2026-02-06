// src/payments/entities/refund.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Transaction } from './transaction.entity';

export enum RefundStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  FAILED = 'FAILED',
}

export enum RefundReason {
  CUSTOMER_REQUEST = 'CUSTOMER_REQUEST',
  PRODUCT_DEFECT = 'PRODUCT_DEFECT',
  WRONG_PRODUCT = 'WRONG_PRODUCT',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  DUPLICATE_PAYMENT = 'DUPLICATE_PAYMENT',
  PRICE_ADJUSTMENT = 'PRICE_ADJUSTMENT',
  SERVICE_ISSUE = 'SERVICE_ISSUE',
  OTHER = 'OTHER',
}

@Entity('refunds')
export class Refund {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  refundNumber: string;

  @Column({ type: 'uuid' })
  transactionId: string;

  @ManyToOne(() => Transaction, (transaction) => transaction.refunds)
  @JoinColumn({ name: 'transactionId' })
  transaction: Transaction;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 10, default: 'XOF' })
  currency: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: RefundStatus.PENDING,
  })
  status: RefundStatus;

  @Column({
    type: 'varchar',
    length: 25,
    default: RefundReason.CUSTOMER_REQUEST,
  })
  reason: RefundReason;

  @Column({ type: 'text', nullable: true })
  reasonDetails: string;

  @Column({ type: 'uuid', nullable: true })
  orderId: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  orderNumber: string;

  @Column({ type: 'uuid', nullable: true })
  customerId: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  customerName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  externalReference: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  providerRefundId: string | null;

  @Column({ type: 'text', nullable: true })
  providerResponse: string | null;

  @Column({ type: 'uuid' })
  requestedBy: string;

  @Column({ type: 'varchar', length: 100 })
  requestedByName: string;

  @Column({ type: 'uuid', nullable: true })
  approvedBy: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  approvedByName: string;

  @Column({ type: 'datetime', nullable: true })
  approvedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  processedBy: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  processedByName: string;

  @Column({ type: 'datetime', nullable: true })
  processedAt: Date;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string;

  @Column({ type: 'varchar', length: 50 })
  tenantId: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

