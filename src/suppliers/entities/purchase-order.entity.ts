// src/suppliers/entities/purchase-order.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PurchaseOrderStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
  CLOSED = 'CLOSED',
}

export enum PurchaseOrderPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

@Entity('purchase_orders')
export class PurchaseOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'varchar' })
  tenantId: string;

  @Column({ name: 'order_number', type: 'varchar', unique: true })
  orderNumber: string;

  @Column({ name: 'supplier_id', type: 'varchar' })
  supplierId: string;

  @Column({ name: 'supplier_name', type: 'varchar' })
  supplierName: string;

  @Column({ type: 'varchar', enum: PurchaseOrderStatus, default: PurchaseOrderStatus.DRAFT })
  status: PurchaseOrderStatus;

  @Column({ type: 'varchar', enum: PurchaseOrderPriority, default: PurchaseOrderPriority.NORMAL })
  priority: PurchaseOrderPriority;

  @Column({ name: 'order_date', type: 'datetime' })
  orderDate: Date;

  @Column({ name: 'expected_date', type: 'datetime', nullable: true })
  expectedDate: Date;

  @Column({ name: 'received_date', type: 'datetime', nullable: true })
  receivedDate: Date;

  @Column({ name: 'total_items', type: 'integer', default: 0 })
  totalItems: number;

  @Column({ name: 'total_quantity', type: 'integer', default: 0 })
  totalQuantity: number;

  @Column({ name: 'received_quantity', type: 'integer', default: 0 })
  receivedQuantity: number;

  @Column({ name: 'subtotal', type: 'decimal', precision: 12, scale: 2, default: 0 })
  subtotal: number;

  @Column({ name: 'tax_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ name: 'discount_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ name: 'shipping_cost', type: 'decimal', precision: 12, scale: 2, default: 0 })
  shippingCost: number;

  @Column({ name: 'total_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ type: 'varchar', nullable: true })
  currency: string;

  @Column({ name: 'payment_terms', type: 'varchar', nullable: true })
  paymentTerms: string;

  @Column({ name: 'payment_status', type: 'varchar', default: 'PENDING' })
  paymentStatus: string;

  @Column({ name: 'paid_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  paidAmount: number;

  @Column({ name: 'shipping_address', type: 'text', nullable: true })
  shippingAddress: string;

  @Column({ name: 'billing_address', type: 'text', nullable: true })
  billingAddress: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'internal_notes', type: 'text', nullable: true })
  internalNotes: string;

  @Column({ name: 'reference_number', type: 'varchar', nullable: true })
  referenceNumber: string;

  @Column({ name: 'created_by', type: 'varchar' })
  createdBy: string;

  @Column({ name: 'created_by_name', type: 'varchar', nullable: true })
  createdByName: string;

  @Column({ name: 'approved_by', type: 'varchar', nullable: true })
  approvedBy: string;

  @Column({ name: 'approved_at', type: 'datetime', nullable: true })
  approvedAt: Date;

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
