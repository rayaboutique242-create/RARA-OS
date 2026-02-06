// src/settings/entities/currency.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('currencies')
export class Currency {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 3 })
  code: string; // ISO 4217: XOF, EUR, USD

  @Column({ type: 'varchar', length: 50 })
  name: string;

  @Column({ type: 'varchar', length: 10 })
  symbol: string; // FCFA, €, $

  @Column({ type: 'varchar', length: 10, default: 'before' })
  symbolPosition: string; // 'before' or 'after'

  @Column({ type: 'int', default: 0 })
  decimalPlaces: number;

  @Column({ type: 'varchar', length: 5, default: ',' })
  decimalSeparator: string;

  @Column({ type: 'varchar', length: 5, default: ' ' })
  thousandsSeparator: string;

  @Column({ type: 'decimal', precision: 15, scale: 6, default: 1 })
  exchangeRate: number; // Taux par rapport à la devise de base

  @Column({ type: 'boolean', default: false })
  isBaseCurrency: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'datetime', nullable: true })
  exchangeRateUpdatedAt: Date;

  @Column({ type: 'varchar', length: 50 })
  tenantId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
