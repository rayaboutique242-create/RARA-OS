// src/suppliers/entities/supplier.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum SupplierStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  BLOCKED = 'BLOCKED',
  PENDING = 'PENDING',
}

export enum PaymentTerms {
  IMMEDIATE = 'IMMEDIATE',
  NET_15 = 'NET_15',
  NET_30 = 'NET_30',
  NET_45 = 'NET_45',
  NET_60 = 'NET_60',
  NET_90 = 'NET_90',
}

@Entity('suppliers')
export class Supplier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'varchar' })
  tenantId: string;

  @Column({ name: 'supplier_code', type: 'varchar', unique: true })
  supplierCode: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ name: 'contact_name', type: 'varchar', nullable: true })
  contactName: string;

  @Column({ type: 'varchar', nullable: true })
  email: string;

  @Column({ type: 'varchar', nullable: true })
  phone: string;

  @Column({ name: 'secondary_phone', type: 'varchar', nullable: true })
  secondaryPhone: string;

  @Column({ type: 'varchar', nullable: true })
  fax: string;

  @Column({ type: 'varchar', nullable: true })
  website: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ type: 'varchar', nullable: true })
  city: string;

  @Column({ type: 'varchar', nullable: true })
  country: string;

  @Column({ name: 'postal_code', type: 'varchar', nullable: true })
  postalCode: string;

  @Column({ name: 'tax_id', type: 'varchar', nullable: true })
  taxId: string;

  @Column({ name: 'registration_number', type: 'varchar', nullable: true })
  registrationNumber: string;

  @Column({ type: 'varchar', enum: SupplierStatus, default: SupplierStatus.ACTIVE })
  status: SupplierStatus;

  @Column({ name: 'payment_terms', type: 'varchar', enum: PaymentTerms, default: PaymentTerms.NET_30 })
  paymentTerms: PaymentTerms;

  @Column({ type: 'varchar', nullable: true })
  currency: string;

  @Column({ name: 'bank_name', type: 'varchar', nullable: true })
  bankName: string;

  @Column({ name: 'bank_account', type: 'varchar', nullable: true })
  bankAccount: string;

  @Column({ name: 'bank_iban', type: 'varchar', nullable: true })
  bankIban: string;

  @Column({ name: 'credit_limit', type: 'decimal', precision: 12, scale: 2, default: 0 })
  creditLimit: number;

  @Column({ name: 'current_balance', type: 'decimal', precision: 12, scale: 2, default: 0 })
  currentBalance: number;

  @Column({ name: 'total_purchases', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalPurchases: number;

  @Column({ name: 'total_orders', type: 'integer', default: 0 })
  totalOrders: number;

  @Column({ name: 'average_delivery_days', type: 'integer', default: 0 })
  averageDeliveryDays: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'simple-json', nullable: true })
  categories: string[];

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
