// src/payments/entities/transaction.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { PaymentMethod } from './payment-method.entity';

export enum TransactionType {
  PAYMENT = 'PAYMENT',
  REFUND = 'REFUND',
  PARTIAL_PAYMENT = 'PARTIAL_PAYMENT',
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  transactionNumber: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: TransactionType.PAYMENT,
  })
  type: TransactionType;

  @Column({
    type: 'varchar',
    length: 25,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  feeAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  netAmount: number;

  @Column({ type: 'varchar', length: 10, default: 'XOF' })
  currency: string;

  @Column({ type: 'uuid', nullable: true })
  orderId: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  orderNumber: string;

  @Column({ type: 'uuid', nullable: true })
  customerId: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  customerName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  customerPhone: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  customerEmail: string;

  @Column({ type: 'uuid' })
  paymentMethodId: string;

  @ManyToOne(() => PaymentMethod, (method) => method.transactions)
  @JoinColumn({ name: 'paymentMethodId' })
  paymentMethod: PaymentMethod;

  @Column({ type: 'varchar', length: 100, nullable: true })
  externalReference: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  providerTransactionId: string | null;

  @Column({ type: 'text', nullable: true })
  providerResponse: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  refundedAmount: number;

  @Column({ type: 'uuid', nullable: true })
  processedBy: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  processedByName: string;

  @Column({ type: 'datetime', nullable: true })
  processedAt: Date;

  @Column({ type: 'varchar', length: 50 })
  tenantId: string;

  @Column({ type: 'text', nullable: true })
  metadata: string;

  @OneToMany('Refund', 'transaction')
  refunds: any[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

