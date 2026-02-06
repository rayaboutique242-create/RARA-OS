// src/loyalty/entities/loyalty-program.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { LoyaltyTier } from './loyalty-tier.entity';
import { LoyaltyReward } from './loyalty-reward.entity';

export enum ProgramStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export enum PointsEarnType {
  FIXED = 'FIXED', // Points fixes par achat
  PERCENTAGE = 'PERCENTAGE', // % du montant en points
  TIERED = 'TIERED', // Selon le niveau du client
}

@Entity('loyalty_programs')
export class LoyaltyProgram {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  programCode: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  tenantId: string;

  // Configuration des points
  @Column({
    type: 'varchar',
    length: 20,
    default: PointsEarnType.PERCENTAGE,
  })
  pointsEarnType: PointsEarnType;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 1 })
  pointsPerUnit: number; // Ex: 1 point par 100 FCFA dépensés

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 100 })
  currencyPerPoint: number; // Ex: 100 FCFA = 1 point

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 1 })
  pointValue: number; // Valeur d'1 point en devise (pour échange)

  // Bonus
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  welcomeBonus: number; // Points bonus à l'inscription

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  birthdayBonus: number; // Points bonus anniversaire

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  referralBonus: number; // Points bonus parrainage

  // Règles
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  minimumPurchaseForPoints: number; // Montant minimum pour gagner des points

  @Column({ type: 'int', default: 0 })
  minimumPointsForRedemption: number; // Minimum de points pour échanger

  @Column({ type: 'int', default: 365 })
  pointsExpirationDays: number; // Expiration des points (0 = jamais)

  @Column({ type: 'int', default: 0 })
  maxPointsPerTransaction: number; // 0 = illimité

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 100 })
  maxRedemptionPercentage: number; // % max du total payable en points

  // Multiplicateurs par catégorie (JSON)
  @Column({ type: 'text', nullable: true })
  categoryMultipliers: string; // {"electronics": 2, "clothing": 1.5}

  // Produits exclus (JSON)
  @Column({ type: 'text', nullable: true })
  excludedProductIds: string; // [1, 5, 10]

  // Catégories exclues (JSON)
  @Column({ type: 'text', nullable: true })
  excludedCategoryIds: string; // [3, 7]

  // Statut
  @Column({
    type: 'varchar',
    length: 20,
    default: ProgramStatus.ACTIVE,
  })
  status: ProgramStatus;

  @Column({ type: 'timestamp', nullable: true })
  startDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  endDate: Date;

  // Termes et conditions
  @Column({ type: 'text', nullable: true })
  termsAndConditions: string;

  // Relations
  @OneToMany(() => LoyaltyTier, (tier) => tier.program)
  tiers: LoyaltyTier[];

  @OneToMany(() => LoyaltyReward, (reward) => reward.program)
  rewards: LoyaltyReward[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
