// src/products/entities/product.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 50, unique: true })
  sku: string;

  @Column({ length: 50, nullable: true })
  barcode: string;

  @Column({ name: 'category_id', nullable: true })
  categoryId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'purchase_price', default: 0 })
  purchasePrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'selling_price' })
  sellingPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'wholesale_price', nullable: true })
  wholesalePrice: number;

  @Column({ type: 'integer', default: 0, name: 'stock_quantity' })
  stockQuantity: number;

  @Column({ type: 'integer', default: 5, name: 'min_stock_level' })
  minStockLevel: number;

  @Column({ type: 'integer', default: 100, name: 'max_stock_level' })
  maxStockLevel: number;

  @Column({ length: 20, nullable: true })
  unit: string;

  @Column({ name: 'image_url', nullable: true })
  imageUrl: string;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ default: false, name: 'is_featured' })
  isFeatured: boolean;

  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'tax_rate', default: 0 })
  taxRate: number;

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'created_by', nullable: true })
  createdBy: string;
}
