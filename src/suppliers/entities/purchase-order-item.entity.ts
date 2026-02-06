// src/suppliers/entities/purchase-order-item.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('purchase_order_items')
export class PurchaseOrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'varchar' })
  tenantId: string;

  @Column({ name: 'purchase_order_id', type: 'varchar' })
  purchaseOrderId: string;

  @Column({ name: 'product_id', type: 'varchar' })
  productId: string;

  @Column({ name: 'product_name', type: 'varchar' })
  productName: string;

  @Column({ name: 'product_sku', type: 'varchar' })
  productSku: string;

  @Column({ name: 'supplier_sku', type: 'varchar', nullable: true })
  supplierSku: string;

  @Column({ name: 'ordered_quantity', type: 'integer' })
  orderedQuantity: number;

  @Column({ name: 'received_quantity', type: 'integer', default: 0 })
  receivedQuantity: number;

  @Column({ name: 'pending_quantity', type: 'integer', default: 0 })
  pendingQuantity: number;

  @Column({ name: 'unit_cost', type: 'decimal', precision: 10, scale: 2 })
  unitCost: number;

  @Column({ name: 'tax_rate', type: 'decimal', precision: 5, scale: 2, default: 0 })
  taxRate: number;

  @Column({ name: 'tax_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ name: 'discount_percent', type: 'decimal', precision: 5, scale: 2, default: 0 })
  discountPercent: number;

  @Column({ name: 'discount_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ name: 'line_total', type: 'decimal', precision: 12, scale: 2 })
  lineTotal: number;

  @Column({ name: 'is_fully_received', type: 'boolean', default: false })
  isFullyReceived: boolean;

  @Column({ name: 'last_received_at', type: 'datetime', nullable: true })
  lastReceivedAt: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
