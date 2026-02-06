// src/loyalty/entities/loyalty-reward.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { LoyaltyProgram } from './loyalty-program.entity';

export enum RewardType {
  DISCOUNT_PERCENTAGE = 'DISCOUNT_PERCENTAGE', // Réduction en %
  DISCOUNT_FIXED = 'DISCOUNT_FIXED', // Réduction fixe
  FREE_PRODUCT = 'FREE_PRODUCT', // Produit gratuit
  FREE_SHIPPING = 'FREE_SHIPPING', // Livraison gratuite
  GIFT_CARD = 'GIFT_CARD', // Carte cadeau
  CASHBACK = 'CASHBACK', // Remboursement
  EXPERIENCE = 'EXPERIENCE', // Expérience VIP
  UPGRADE = 'UPGRADE', // Upgrade de service
  CUSTOM = 'CUSTOM', // Personnalisé
}

export enum RewardStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  EXPIRED = 'EXPIRED',
}

@Entity('loyalty_rewards')
export class LoyaltyReward {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  rewardCode: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  tenantId: string;

  // Type et valeur
  @Column({ type: 'varchar', length: 30 })
  type: RewardType;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  value: number; // Valeur de la récompense (% ou montant)

  @Column({ type: 'int' })
  pointsCost: number; // Points nécessaires pour obtenir

  // Produit gratuit (si applicable)
  @Column({ type: 'int', nullable: true })
  freeProductId: number;

  @Column({ type: 'varchar', length: 200, nullable: true })
  freeProductName: string;

  @Column({ type: 'int', default: 1 })
  freeProductQuantity: number;

  // Limites
  @Column({ type: 'int', default: 0 })
  stockQuantity: number; // 0 = illimité

  @Column({ type: 'int', default: 0 })
  totalRedeemed: number; // Nombre total échangé

  @Column({ type: 'int', default: 0 })
  maxRedemptionsPerCustomer: number; // 0 = illimité

  @Column({ type: 'int', default: 0 })
  maxRedemptionsTotal: number; // 0 = illimité

  // Conditions
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  minimumPurchaseAmount: number; // Montant minimum d'achat

  @Column({ type: 'varchar', length: 50, nullable: true })
  requiredTierId: string; // Niveau minimum requis

  @Column({ type: 'text', nullable: true })
  eligibleTierIds: string; // JSON: ["GOLD", "PLATINUM"]

  @Column({ type: 'text', nullable: true })
  eligibleCategoryIds: string; // JSON: catégories applicables

  @Column({ type: 'text', nullable: true })
  eligibleProductIds: string; // JSON: produits applicables

  // Validité
  @Column({ type: 'timestamp', nullable: true })
  startDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  endDate: Date;

  @Column({ type: 'int', default: 30 })
  validityDays: number; // Jours de validité après obtention

  // Apparence
  @Column({ type: 'varchar', length: 255, nullable: true })
  imageUrl: string;

  @Column({ type: 'varchar', length: 7, nullable: true })
  color: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  icon: string;

  // Affichage
  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'boolean', default: false })
  isFeatured: boolean;

  @Column({ type: 'boolean', default: true })
  isVisible: boolean;

  // Statut
  @Column({ type: 'varchar', length: 20, default: RewardStatus.ACTIVE })
  status: RewardStatus;

  // Termes
  @Column({ type: 'text', nullable: true })
  termsAndConditions: string;

  // Relation avec le programme
  @Column({ type: 'int' })
  programId: number;

  @ManyToOne(() => LoyaltyProgram, (program) => program.rewards)
  @JoinColumn({ name: 'programId' })
  program: LoyaltyProgram;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
