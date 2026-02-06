// src/loyalty/entities/loyalty-points.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum PointsTransactionType {
  EARN = 'EARN', // Points gagnés
  REDEEM = 'REDEEM', // Points échangés
  BONUS = 'BONUS', // Points bonus
  ADJUSTMENT = 'ADJUSTMENT', // Ajustement manuel
  EXPIRE = 'EXPIRE', // Points expirés
  REFUND = 'REFUND', // Points remboursés
  TRANSFER_IN = 'TRANSFER_IN', // Points reçus
  TRANSFER_OUT = 'TRANSFER_OUT', // Points envoyés
}

export enum PointsSource {
  PURCHASE = 'PURCHASE', // Achat
  WELCOME = 'WELCOME', // Inscription
  BIRTHDAY = 'BIRTHDAY', // Anniversaire
  REFERRAL = 'REFERRAL', // Parrainage
  PROMOTION = 'PROMOTION', // Promotion
  MANUAL = 'MANUAL', // Ajustement manuel
  REDEMPTION = 'REDEMPTION', // Utilisation
  EXPIRATION = 'EXPIRATION', // Expiration
  REFUND = 'REFUND', // Remboursement
  REVIEW = 'REVIEW', // Avis client
  SOCIAL = 'SOCIAL', // Partage social
  GAME = 'GAME', // Jeu/concours
}

@Entity('loyalty_points')
@Index(['customerId', 'tenantId'])
@Index(['transactionType', 'createdAt'])
export class LoyaltyPoints {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  transactionCode: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  tenantId: string;

  // Client
  @Column({ type: 'int' })
  customerId: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  customerName: string;

  // Programme
  @Column({ type: 'int', nullable: true })
  programId: number;

  // Type de transaction
  @Column({ type: 'varchar', length: 20 })
  transactionType: PointsTransactionType;

  @Column({ type: 'varchar', length: 20 })
  source: PointsSource;

  // Points
  @Column({ type: 'int' })
  points: number; // Positif pour earn/bonus, négatif pour redeem/expire

  @Column({ type: 'int', default: 0 })
  balanceBefore: number; // Solde avant transaction

  @Column({ type: 'int', default: 0 })
  balanceAfter: number; // Solde après transaction

  // Détails de l'achat (si applicable)
  @Column({ type: 'int', nullable: true })
  orderId: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  orderNumber: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  orderAmount: number;

  // Multiplicateur appliqué
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 1 })
  multiplier: number;

  // Promotion/bonus associé
  @Column({ type: 'int', nullable: true })
  promotionId: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  promotionCode: string;

  // Référence à la récompense (si échange)
  @Column({ type: 'int', nullable: true })
  rewardId: number;

  @Column({ type: 'int', nullable: true })
  redemptionId: number;

  // Expiration
  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'boolean', default: false })
  isExpired: boolean;

  // Description
  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  // Référence parrainage
  @Column({ type: 'int', nullable: true })
  referredCustomerId: number;

  // Utilisateur qui a fait l'action
  @Column({ type: 'int', nullable: true })
  createdBy: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  createdByName: string;

  // Métadonnées
  @Column({ type: 'text', nullable: true })
  metadata: string; // JSON pour données supplémentaires

  @CreateDateColumn()
  createdAt: Date;
}


