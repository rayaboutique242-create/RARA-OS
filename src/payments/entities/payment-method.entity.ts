// src/payments/entities/payment-method.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

export enum PaymentMethodType {
  CASH = 'CASH',
  MOBILE_MONEY = 'MOBILE_MONEY',
  CARD = 'CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CHECK = 'CHECK',
  CREDIT = 'CREDIT',
  OTHER = 'OTHER',
}

export enum MobileMoneyProvider {
  ORANGE_MONEY = 'ORANGE_MONEY',
  MTN_MOMO = 'MTN_MOMO',
  MOOV_MONEY = 'MOOV_MONEY',
  WAVE = 'WAVE',
  OTHER = 'OTHER',
}

@Entity('payment_methods')
export class PaymentMethod {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: PaymentMethodType.CASH,
  })
  type: PaymentMethodType;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  provider: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  accountNumber: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  accountName: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  transactionFeePercent: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  transactionFeeFixed: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  minAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  maxAmount: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isDefault: boolean;

  @Column({ type: 'boolean', default: true })
  allowRefunds: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true })
  currency: string;

  @Column({ type: 'varchar', length: 50 })
  tenantId: string;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'text', nullable: true })
  icon: string;

  @Column({ type: 'text', nullable: true })
  instructions: string;

  @OneToMany('Transaction', 'paymentMethod')
  transactions: any[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
