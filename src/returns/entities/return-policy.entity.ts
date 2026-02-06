// src/returns/entities/return-policy.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('return_policies')
export class ReturnPolicy {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'int', default: 30 })
  returnWindowDays: number; // Jours pour effectuer un retour

  @Column({ type: 'boolean', default: true })
  allowRefund: boolean;

  @Column({ type: 'boolean', default: true })
  allowExchange: boolean;

  @Column({ type: 'boolean', default: true })
  allowStoreCredit: boolean;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  restockingFeePercent: number;

  @Column({ type: 'boolean', default: false })
  requireReceipt: boolean;

  @Column({ type: 'boolean', default: false })
  requireOriginalPackaging: boolean;

  @Column({ type: 'boolean', default: true })
  requireUnusedCondition: boolean;

  @Column({ type: 'text', nullable: true })
  excludedCategories: string | null; // JSON array of category IDs

  @Column({ type: 'text', nullable: true })
  excludedProducts: string | null; // JSON array of product IDs

  @Column({ type: 'text', nullable: true })
  conditions: string | null; // JSON array of conditions

  @Column({ type: 'int', default: 365 })
  storeCreditValidityDays: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isDefault: boolean;

  @Column({ type: 'int', nullable: true })
  categoryId: number | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  tenantId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helpers
  getExcludedCategories(): number[] {
    if (!this.excludedCategories) return [];
    try {
      return JSON.parse(this.excludedCategories);
    } catch {
      return [];
    }
  }

  getExcludedProducts(): number[] {
    if (!this.excludedProducts) return [];
    try {
      return JSON.parse(this.excludedProducts);
    } catch {
      return [];
    }
  }
}
