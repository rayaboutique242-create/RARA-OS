// src/suppliers/entities/reception-item.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum ReceptionItemStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  PARTIAL = 'PARTIAL',
}

@Entity('reception_items')
export class ReceptionItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'varchar' })
  tenantId: string;

  @Column({ name: 'reception_id', type: 'varchar' })
  receptionId: string;

  @Column({ name: 'purchase_order_item_id', type: 'varchar' })
  purchaseOrderItemId: string;

  @Column({ name: 'product_id', type: 'varchar' })
  productId: string;

  @Column({ name: 'product_name', type: 'varchar' })
  productName: string;

  @Column({ name: 'product_sku', type: 'varchar' })
  productSku: string;

  @Column({ name: 'expected_quantity', type: 'integer' })
  expectedQuantity: number;

  @Column({ name: 'received_quantity', type: 'integer', default: 0 })
  receivedQuantity: number;

  @Column({ name: 'accepted_quantity', type: 'integer', default: 0 })
  acceptedQuantity: number;

  @Column({ name: 'rejected_quantity', type: 'integer', default: 0 })
  rejectedQuantity: number;

  @Column({ type: 'varchar', enum: ReceptionItemStatus, default: ReceptionItemStatus.PENDING })
  status: ReceptionItemStatus;

  @Column({ name: 'unit_cost', type: 'decimal', precision: 10, scale: 2 })
  unitCost: number;

  @Column({ name: 'line_total', type: 'decimal', precision: 12, scale: 2, default: 0 })
  lineTotal: number;

  @Column({ name: 'batch_number', type: 'varchar', nullable: true })
  batchNumber: string;

  @Column({ name: 'expiry_date', type: 'timestamp', nullable: true })
  expiryDate: Date;

  @Column({ name: 'storage_location', type: 'varchar', nullable: true })
  storageLocation: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string;

  @Column({ name: 'quality_check', type: 'boolean', default: false })
  qualityCheck: boolean;

  @Column({ name: 'quality_notes', type: 'text', nullable: true })
  qualityNotes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
