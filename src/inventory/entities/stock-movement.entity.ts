// src/inventory/entities/stock-movement.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum MovementType {
  IN = 'IN',
  OUT = 'OUT',
  ADJUSTMENT = 'ADJUSTMENT',
  TRANSFER = 'TRANSFER',
  RETURN = 'RETURN',
}

export enum MovementReason {
  PURCHASE = 'PURCHASE',
  SALE = 'SALE',
  RETURN_CUSTOMER = 'RETURN_CUSTOMER',
  RETURN_SUPPLIER = 'RETURN_SUPPLIER',
  ADJUSTMENT_POSITIVE = 'ADJUSTMENT_POSITIVE',
  ADJUSTMENT_NEGATIVE = 'ADJUSTMENT_NEGATIVE',
  DAMAGE = 'DAMAGE',
  EXPIRED = 'EXPIRED',
  THEFT = 'THEFT',
  TRANSFER_IN = 'TRANSFER_IN',
  TRANSFER_OUT = 'TRANSFER_OUT',
  INITIAL_STOCK = 'INITIAL_STOCK',
  INVENTORY_COUNT = 'INVENTORY_COUNT',
  OTHER = 'OTHER',
}

@Entity('stock_movements')
export class StockMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'varchar' })
  tenantId: string;

  @Column({ name: 'product_id', type: 'varchar' })
  productId: string;

  @Column({ name: 'product_name', type: 'varchar' })
  productName: string;

  @Column({ name: 'product_sku', type: 'varchar' })
  productSku: string;

  @Column({ type: 'varchar', enum: MovementType })
  type: MovementType;

  @Column({ type: 'varchar', enum: MovementReason })
  reason: MovementReason;

  @Column({ type: 'integer' })
  quantity: number;

  @Column({ name: 'quantity_before', type: 'integer' })
  quantityBefore: number;

  @Column({ name: 'quantity_after', type: 'integer' })
  quantityAfter: number;

  @Column({ name: 'unit_cost', type: 'decimal', precision: 10, scale: 2, nullable: true })
  unitCost: number;

  @Column({ name: 'total_cost', type: 'decimal', precision: 10, scale: 2, nullable: true })
  totalCost: number;

  @Column({ name: 'reference_type', type: 'varchar', nullable: true })
  referenceType: string;

  @Column({ name: 'reference_id', type: 'varchar', nullable: true })
  referenceId: string;

  @Column({ name: 'reference_number', type: 'varchar', nullable: true })
  referenceNumber: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'location_from', type: 'varchar', nullable: true })
  locationFrom: string;

  @Column({ name: 'location_to', type: 'varchar', nullable: true })
  locationTo: string;

  @Column({ name: 'batch_number', type: 'varchar', nullable: true })
  batchNumber: string;

  @Column({ name: 'expiry_date', type: 'timestamp', nullable: true })
  expiryDate: Date;

  @Column({ name: 'created_by', type: 'varchar' })
  createdBy: string;

  @Column({ name: 'created_by_name', type: 'varchar' })
  createdByName: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
