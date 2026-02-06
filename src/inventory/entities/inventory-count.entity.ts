// src/inventory/entities/inventory-count.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum InventoryCountStatus {
  DRAFT = 'DRAFT',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  VALIDATED = 'VALIDATED',
}

export enum InventoryCountType {
  FULL = 'FULL',
  PARTIAL = 'PARTIAL',
  CYCLE = 'CYCLE',
  SPOT = 'SPOT',
}

@Entity('inventory_counts')
export class InventoryCount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'varchar' })
  tenantId: string;

  @Column({ name: 'count_number', type: 'varchar', unique: true })
  countNumber: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', enum: InventoryCountType, default: InventoryCountType.FULL })
  type: InventoryCountType;

  @Column({ type: 'varchar', enum: InventoryCountStatus, default: InventoryCountStatus.DRAFT })
  status: InventoryCountStatus;

  @Column({ type: 'varchar', nullable: true })
  location: string;

  @Column({ name: 'category_id', type: 'varchar', nullable: true })
  categoryId: string;

  @Column({ name: 'started_at', type: 'datetime', nullable: true })
  startedAt: Date;

  @Column({ name: 'completed_at', type: 'datetime', nullable: true })
  completedAt: Date;

  @Column({ name: 'validated_at', type: 'datetime', nullable: true })
  validatedAt: Date;

  @Column({ name: 'total_products', type: 'integer', default: 0 })
  totalProducts: number;

  @Column({ name: 'counted_products', type: 'integer', default: 0 })
  countedProducts: number;

  @Column({ name: 'products_with_variance', type: 'integer', default: 0 })
  productsWithVariance: number;

  @Column({ name: 'total_variance_quantity', type: 'integer', default: 0 })
  totalVarianceQuantity: number;

  @Column({ name: 'total_variance_value', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalVarianceValue: number;

  @Column({ name: 'created_by', type: 'varchar' })
  createdBy: string;

  @Column({ name: 'created_by_name', type: 'varchar', nullable: true })
  createdByName: string;

  @Column({ name: 'validated_by', type: 'varchar', nullable: true })
  validatedBy: string;

  @Column({ name: 'validated_by_name', type: 'varchar', nullable: true })
  validatedByName: string;

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
