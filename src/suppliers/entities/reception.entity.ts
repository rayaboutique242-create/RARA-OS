// src/suppliers/entities/reception.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum ReceptionStatus {
  PENDING = 'PENDING',
  INSPECTING = 'INSPECTING',
  ACCEPTED = 'ACCEPTED',
  PARTIAL = 'PARTIAL',
  REJECTED = 'REJECTED',
}

@Entity('receptions')
export class Reception {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'varchar' })
  tenantId: string;

  @Column({ name: 'reception_number', type: 'varchar', unique: true })
  receptionNumber: string;

  @Column({ name: 'purchase_order_id', type: 'varchar' })
  purchaseOrderId: string;

  @Column({ name: 'purchase_order_number', type: 'varchar' })
  purchaseOrderNumber: string;

  @Column({ name: 'supplier_id', type: 'varchar' })
  supplierId: string;

  @Column({ name: 'supplier_name', type: 'varchar' })
  supplierName: string;

  @Column({ type: 'varchar', enum: ReceptionStatus, default: ReceptionStatus.PENDING })
  status: ReceptionStatus;

  @Column({ name: 'reception_date', type: 'datetime' })
  receptionDate: Date;

  @Column({ name: 'delivery_note_number', type: 'varchar', nullable: true })
  deliveryNoteNumber: string;

  @Column({ name: 'invoice_number', type: 'varchar', nullable: true })
  invoiceNumber: string;

  @Column({ name: 'total_items', type: 'integer', default: 0 })
  totalItems: number;

  @Column({ name: 'total_quantity_expected', type: 'integer', default: 0 })
  totalQuantityExpected: number;

  @Column({ name: 'total_quantity_received', type: 'integer', default: 0 })
  totalQuantityReceived: number;

  @Column({ name: 'total_quantity_accepted', type: 'integer', default: 0 })
  totalQuantityAccepted: number;

  @Column({ name: 'total_quantity_rejected', type: 'integer', default: 0 })
  totalQuantityRejected: number;

  @Column({ name: 'total_value', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalValue: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string;

  @Column({ name: 'received_by', type: 'varchar' })
  receivedBy: string;

  @Column({ name: 'received_by_name', type: 'varchar', nullable: true })
  receivedByName: string;

  @Column({ name: 'inspected_by', type: 'varchar', nullable: true })
  inspectedBy: string;

  @Column({ name: 'inspected_at', type: 'datetime', nullable: true })
  inspectedAt: Date;

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
