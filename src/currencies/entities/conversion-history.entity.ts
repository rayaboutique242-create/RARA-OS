// src/currencies/entities/conversion-history.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('conversion_history')
export class ConversionHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  tenantId: string | null;

  @Column({ type: 'varchar', length: 3 })
  fromCurrency: string;

  @Column({ type: 'varchar', length: 3 })
  toCurrency: string;

  @Column({ type: 'decimal', precision: 18, scale: 4 })
  originalAmount: number;

  @Column({ type: 'decimal', precision: 18, scale: 4 })
  convertedAmount: number;

  @Column({ type: 'decimal', precision: 18, scale: 8 })
  rateUsed: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  context: string | null; // ORDER, PAYMENT, QUOTE, MANUAL

  @Column({ type: 'varchar', length: 50, nullable: true })
  referenceType: string | null; // order, payment, etc.

  @Column({ type: 'integer', nullable: true })
  referenceId: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  performedBy: string | null;

  @CreateDateColumn()
  convertedAt: Date;
}
