// src/loyalty/entities/loyalty-redemption.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum RedemptionStatus {
  PENDING = 'PENDING', // En attente
  APPROVED = 'APPROVED', // Approuvé
  FULFILLED = 'FULFILLED', // Réalisé/Livré
  USED = 'USED', // Utilisé
  CANCELLED = 'CANCELLED', // Annulé
  EXPIRED = 'EXPIRED', // Expiré
  REFUNDED = 'REFUNDED', // Remboursé
}

@Entity('loyalty_redemptions')
@Index(['customerId', 'status'])
@Index(['redemptionCode'])
export class LoyaltyRedemption {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  redemptionCode: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  tenantId: string;

  // Client
  @Column({ type: 'int' })
  customerId: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  customerName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  customerEmail: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  customerPhone: string;

  // Récompense
  @Column({ type: 'int' })
  rewardId: number;

  @Column({ type: 'varchar', length: 50 })
  rewardCode: string;

  @Column({ type: 'varchar', length: 100 })
  rewardName: string;

  @Column({ type: 'varchar', length: 30 })
  rewardType: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  rewardValue: number;

  // Points
  @Column({ type: 'int' })
  pointsUsed: number;

  @Column({ type: 'int', default: 0 })
  pointsBalanceBefore: number;

  @Column({ type: 'int', default: 0 })
  pointsBalanceAfter: number;

  // Code généré (pour coupon/voucher)
  @Column({ type: 'varchar', length: 50, nullable: true })
  voucherCode: string;

  // Valeur monétaire équivalente
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  monetaryValue: number;

  // Utilisation
  @Column({ type: 'int', nullable: true })
  usedOnOrderId: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  usedOnOrderNumber: string | null;

  @Column({ type: 'datetime', nullable: true })
  usedAt: Date;

  // Validité
  @Column({ type: 'datetime' })
  expiresAt: Date;

  // Statut
  @Column({ type: 'varchar', length: 20, default: RedemptionStatus.PENDING })
  status: RedemptionStatus;

  // Historique des statuts (JSON)
  @Column({ type: 'text', nullable: true })
  statusHistory: string; // [{"status": "APPROVED", "date": "...", "by": "..."}]

  // Notes
  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'text', nullable: true })
  customerNotes: string;

  // Annulation/Remboursement
  @Column({ type: 'datetime', nullable: true })
  cancelledAt: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  cancellationReason: string;

  @Column({ type: 'boolean', default: false })
  pointsRefunded: boolean;

  @Column({ type: 'datetime', nullable: true })
  refundedAt: Date;

  // Approbation
  @Column({ type: 'int', nullable: true })
  approvedBy: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  approvedByName: string;

  @Column({ type: 'datetime', nullable: true })
  approvedAt: Date;

  // Fulfillment
  @Column({ type: 'int', nullable: true })
  fulfilledBy: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  fulfilledByName: string;

  @Column({ type: 'datetime', nullable: true })
  fulfilledAt: Date;

  // Métadonnées
  @Column({ type: 'text', nullable: true })
  metadata: string;

  // Audit
  @Column({ type: 'int', nullable: true })
  createdBy: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  createdByName: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

