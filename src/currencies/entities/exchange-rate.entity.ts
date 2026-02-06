// src/currencies/entities/exchange-rate.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('exchange_rates')
@Index(['fromCurrency', 'toCurrency'])
export class ExchangeRate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  tenantId: string | null;

  @Column({ type: 'varchar', length: 3 })
  fromCurrency: string; // Code ISO (USD, EUR, XOF)

  @Column({ type: 'varchar', length: 3 })
  toCurrency: string;

  @Column({ type: 'decimal', precision: 18, scale: 8 })
  rate: number;

  @Column({ type: 'decimal', precision: 18, scale: 8, nullable: true })
  inverseRate: number | null;

  @Column({ type: 'decimal', precision: 18, scale: 8, nullable: true })
  buyRate: number | null; // Taux d'achat

  @Column({ type: 'decimal', precision: 18, scale: 8, nullable: true })
  sellRate: number | null; // Taux de vente

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  spreadPercent: number; // Marge en %

  @Column({ type: 'varchar', length: 50, default: 'MANUAL' })
  source: string; // MANUAL, API, BANK

  @Column({ type: 'varchar', length: 200, nullable: true })
  sourceDetails: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'datetime' })
  effectiveDate: Date;

  @Column({ type: 'datetime', nullable: true })
  expiryDate: Date | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  createdBy: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
