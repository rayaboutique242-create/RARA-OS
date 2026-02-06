// src/inventory/entities/inventory-count-item.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('inventory_count_items')
export class InventoryCountItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'varchar' })
  tenantId: string;

  @Column({ name: 'inventory_count_id', type: 'varchar' })
  inventoryCountId: string;

  @Column({ name: 'product_id', type: 'varchar' })
  productId: string;

  @Column({ name: 'product_name', type: 'varchar' })
  productName: string;

  @Column({ name: 'product_sku', type: 'varchar' })
  productSku: string;

  @Column({ name: 'product_barcode', type: 'varchar', nullable: true })
  productBarcode: string;

  @Column({ name: 'expected_quantity', type: 'integer' })
  expectedQuantity: number;

  @Column({ name: 'counted_quantity', type: 'integer', nullable: true })
  countedQuantity: number;

  @Column({ type: 'integer', nullable: true })
  variance: number;

  @Column({ name: 'unit_cost', type: 'decimal', precision: 10, scale: 2, default: 0 })
  unitCost: number;

  @Column({ name: 'variance_value', type: 'decimal', precision: 10, scale: 2, nullable: true })
  varianceValue: number;

  @Column({ name: 'is_counted', type: 'boolean', default: false })
  isCounted: boolean;

  @Column({ name: 'counted_at', type: 'timestamp', nullable: true })
  countedAt: Date;

  @Column({ name: 'counted_by', type: 'varchar', nullable: true })
  countedBy: string;

  @Column({ name: 'counted_by_name', type: 'varchar', nullable: true })
  countedByName: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'varchar', nullable: true })
  location: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
