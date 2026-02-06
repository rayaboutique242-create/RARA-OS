// src/currencies/entities/price-in-currency.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum PriceType {
  PRODUCT = 'PRODUCT',
  SERVICE = 'SERVICE',
  SHIPPING = 'SHIPPING',
  TAX = 'TAX',
  DISCOUNT = 'DISCOUNT',
}

@Entity('prices_in_currency')
@Index(['entityType', 'entityId', 'currencyCode'])
export class PriceInCurrency {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  tenantId: string | null;

  @Column({ type: 'varchar', length: 20 })
  entityType: string; // product, service, shipping

  @Column({ type: 'integer' })
  entityId: number;

  @Column({ type: 'varchar', length: 3 })
  currencyCode: string;

  @Column({ type: 'decimal', precision: 18, scale: 4 })
  price: number;

  @Column({ type: 'decimal', precision: 18, scale: 4, nullable: true })
  originalPrice: number | null; // Prix avant promo

  @Column({ type: 'decimal', precision: 18, scale: 4, nullable: true })
  costPrice: number | null; // Prix de revient

  @Column({ type: 'decimal', precision: 18, scale: 4, nullable: true })
  minPrice: number | null; // Prix minimum autorise

  @Column({ type: 'decimal', precision: 18, scale: 4, nullable: true })
  maxPrice: number | null; // Prix maximum autorise

  @Column({ type: 'boolean', default: false })
  isAutoCalculated: boolean; // Calcule depuis devise de base

  @Column({ type: 'decimal', precision: 18, scale: 8, nullable: true })
  exchangeRateUsed: number | null;

  @Column({ type: 'timestamp', nullable: true })
  rateCalculatedAt: Date | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  effectiveFrom: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  effectiveTo: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
