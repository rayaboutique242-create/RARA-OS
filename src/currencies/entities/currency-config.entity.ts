// src/currencies/entities/currency-config.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('currency_configs')
export class CurrencyConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  tenantId: string | null;

  @Column({ type: 'varchar', length: 3 })
  currencyCode: string; // ISO code

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  nameFr: string | null; // Nom en francais

  @Column({ type: 'varchar', length: 10 })
  symbol: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  symbolNative: string | null;

  @Column({ type: 'integer', default: 2 })
  decimalPlaces: number;

  @Column({ type: 'varchar', length: 5, default: '.' })
  decimalSeparator: string;

  @Column({ type: 'varchar', length: 5, default: ',' })
  thousandsSeparator: string;

  @Column({ type: 'varchar', length: 10, default: 'before' })
  symbolPosition: string; // before, after

  @Column({ type: 'boolean', default: false })
  isBaseCurrency: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: true })
  isDisplayed: boolean; // Afficher dans les listes

  @Column({ type: 'integer', default: 0 })
  displayOrder: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  countryCode: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper pour formater un montant
  formatAmount(amount: number): string {
    const fixed = amount.toFixed(this.decimalPlaces);
    const [intPart, decPart] = fixed.split('.');
    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, this.thousandsSeparator);
    const formatted = decPart ? `${formattedInt}${this.decimalSeparator}${decPart}` : formattedInt;
    
    return this.symbolPosition === 'before' 
      ? `${this.symbol}${formatted}`
      : `${formatted} ${this.symbol}`;
  }
}
