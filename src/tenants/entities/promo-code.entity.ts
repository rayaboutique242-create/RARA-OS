// src/tenants/entities/promo-code.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';

export enum PromoCodeStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  EXHAUSTED = 'EXHAUSTED',
  DISABLED = 'DISABLED',
}

export enum SubscriptionPlan {
  FREE = 'FREE',
  STARTER = 'STARTER',
  PROFESSIONAL = 'PROFESSIONAL',
  ENTERPRISE = 'ENTERPRISE',
  CUSTOM = 'CUSTOM',
}

export enum PromoDuration {
  ONE_MONTH = '1_MONTH',
  THREE_MONTHS = '3_MONTHS',
  SIX_MONTHS = '6_MONTHS',
  ONE_YEAR = '1_YEAR',
  TWO_YEARS = '2_YEARS',
  LIFETIME = 'LIFETIME',
}

@Entity('saas_promo_codes')
@Index(['code'], { unique: true })
@Index(['status'])
@Index(['plan'])
export class PromoCode {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // Le plan accordé par ce code promo
  @Column({ type: 'varchar', length: 30, default: SubscriptionPlan.PROFESSIONAL })
  plan: SubscriptionPlan;

  // Durée de l'abonnement accordé
  @Column({ type: 'varchar', length: 30, default: PromoDuration.ONE_MONTH })
  duration: PromoDuration;

  // Nombre de jours exacts (calculé automatiquement ou personnalisé)
  @Column({ type: 'int', default: 30 })
  durationDays: number;

  @Column({ type: 'varchar', length: 20, default: PromoCodeStatus.ACTIVE })
  status: PromoCodeStatus;

  // Nombre maximum d'utilisations (null = illimité)
  @Column({ type: 'int', nullable: true })
  maxRedemptions: number | null;

  // Nombre actuel d'utilisations
  @Column({ type: 'int', default: 0 })
  redemptionCount: number;

  // Date d'expiration du code (null = pas d'expiration)
  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  // Limites de features accordées (override les defaults du plan)
  @Column({ type: 'int', nullable: true })
  maxUsers: number;

  @Column({ type: 'int', nullable: true })
  maxProducts: number;

  @Column({ type: 'int', nullable: true })
  maxStores: number;

  @Column({ type: 'int', nullable: true })
  maxOrdersPerMonth: number;

  @Column({ type: 'int', nullable: true })
  storageQuotaGB: number;

  // Features activées
  @Column({ type: 'boolean', nullable: true })
  featureInventory: boolean;

  @Column({ type: 'boolean', nullable: true })
  featureOrders: boolean;

  @Column({ type: 'boolean', nullable: true })
  featureDelivery: boolean;

  @Column({ type: 'boolean', nullable: true })
  featureLoyalty: boolean;

  @Column({ type: 'boolean', nullable: true })
  featureAnalytics: boolean;

  @Column({ type: 'boolean', nullable: true })
  featureApi: boolean;

  @Column({ type: 'boolean', nullable: true })
  featureMultiStore: boolean;

  // Code créé par (admin)
  @Column({ type: 'int', nullable: true })
  createdBy: number;

  // Notes internes
  @Column({ type: 'text', nullable: true })
  internalNotes: string;

  @OneToMany('PromoCodeRedemption', 'promoCode')
  redemptions: any[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
