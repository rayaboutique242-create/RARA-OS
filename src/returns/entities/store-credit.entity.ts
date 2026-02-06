// src/returns/entities/store-credit.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum CreditStatus {
  ACTIVE = 'ACTIVE',
  PARTIALLY_USED = 'PARTIALLY_USED',
  FULLY_USED = 'FULLY_USED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

@Entity('store_credits')
export class StoreCredit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  creditCode: string;

  @Column({ type: 'int' })
  customerId: number;

  @Column({ type: 'varchar', length: 100 })
  customerName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  customerEmail: string | null;

  @Column({ type: 'int', nullable: true })
  returnRequestId: number | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  returnNumber: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  originalAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  currentBalance: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  usedAmount: number;

  @Column({ type: 'varchar', length: 10, default: 'XOF' })
  currency: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: CreditStatus.ACTIVE,
  })
  status: CreditStatus;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'text', nullable: true })
  usageHistory: string | null; // JSON array

  @Column({ type: 'int', nullable: true })
  issuedById: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  issuedByName: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  tenantId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helpers
  getUsageHistory(): Array<{ orderId: number; amount: number; date: string }> {
    if (!this.usageHistory) return [];
    try {
      return JSON.parse(this.usageHistory);
    } catch {
      return [];
    }
  }

  addUsage(orderId: number, amount: number): void {
    const history = this.getUsageHistory();
    history.push({ orderId, amount, date: new Date().toISOString() });
    this.usageHistory = JSON.stringify(history);
    this.usedAmount += amount;
    this.currentBalance -= amount;
    
    if (this.currentBalance <= 0) {
      this.status = CreditStatus.FULLY_USED;
    } else {
      this.status = CreditStatus.PARTIALLY_USED;
    }
  }
}
