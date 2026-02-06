// src/settings/entities/tax-rate.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum TaxType {
  VAT = 'VAT',           // TVA
  SALES_TAX = 'SALES_TAX',
  GST = 'GST',           // Goods and Services Tax
  EXCISE = 'EXCISE',
  CUSTOM = 'CUSTOM',
}

export enum TaxScope {
  ALL_PRODUCTS = 'ALL_PRODUCTS',
  SPECIFIC_CATEGORIES = 'SPECIFIC_CATEGORIES',
  SPECIFIC_PRODUCTS = 'SPECIFIC_PRODUCTS',
  SHIPPING = 'SHIPPING',
}

@Entity('tax_rates')
export class TaxRate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string; // TVA-18, TVA-0, EXEMPT

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 20, default: TaxType.VAT })
  type: TaxType;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  rate: number; // 18.00 pour 18%

  @Column({ type: 'varchar', length: 30, default: TaxScope.ALL_PRODUCTS })
  scope: TaxScope;

  @Column({ type: 'text', nullable: true })
  categoryIds: string | null; // JSON array of category IDs

  @Column({ type: 'text', nullable: true })
  productIds: string | null; // JSON array of product IDs

  @Column({ type: 'boolean', default: true })
  isCompound: boolean; // Si taxe s'applique sur le total avec autres taxes

  @Column({ type: 'boolean', default: true })
  isIncludedInPrice: boolean; // Prix TTC ou HT

  @Column({ type: 'boolean', default: false })
  isDefault: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  priority: number; // Ordre d'application des taxes

  @Column({ type: 'varchar', length: 100, nullable: true })
  country: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  region: string | null;

  @Column({ type: 'timestamp', nullable: true })
  effectiveFrom: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  effectiveTo: Date | null;

  @Column({ type: 'varchar', length: 50 })
  tenantId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
