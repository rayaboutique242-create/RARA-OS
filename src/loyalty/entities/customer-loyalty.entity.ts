// src/loyalty/entities/customer-loyalty.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('customer_loyalty')
@Index(['customerId', 'tenantId'], { unique: true })
@Index(['tierId'])
export class CustomerLoyalty {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  tenantId: string;

  // Client
  @Column({ type: 'int' })
  customerId: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  customerName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  customerEmail: string;

  // Programme
  @Column({ type: 'int', nullable: true })
  programId: number;

  // Points
  @Column({ type: 'int', default: 0 })
  currentPoints: number; // Points disponibles actuels

  @Column({ type: 'int', default: 0 })
  totalPointsEarned: number; // Total points gagnés (historique)

  @Column({ type: 'int', default: 0 })
  totalPointsRedeemed: number; // Total points échangés

  @Column({ type: 'int', default: 0 })
  totalPointsExpired: number; // Total points expirés

  @Column({ type: 'int', default: 0 })
  pendingPoints: number; // Points en attente de validation

  // Niveau
  @Column({ type: 'int', nullable: true })
  tierId: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  tierCode: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  tierName: string;

  @Column({ type: 'datetime', nullable: true })
  tierAchievedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  tierExpiresAt: Date;

  // Historique des niveaux
  @Column({ type: 'varchar', length: 50, nullable: true })
  previousTierCode: string;

  @Column({ type: 'datetime', nullable: true })
  tierDowngradedAt: Date;

  // Statistiques
  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  totalSpend: number; // Dépenses totales

  @Column({ type: 'int', default: 0 })
  totalOrders: number; // Nombre total de commandes

  @Column({ type: 'int', default: 0 })
  totalRedemptions: number; // Nombre d'échanges

  // Points expirant bientôt
  @Column({ type: 'int', default: 0 })
  pointsExpiringThisMonth: number;

  @Column({ type: 'datetime', nullable: true })
  nextPointsExpirationDate: Date;

  @Column({ type: 'int', default: 0 })
  nextExpiringPoints: number;

  // Dates importantes
  @Column({ type: 'datetime', nullable: true })
  enrolledAt: Date; // Date d'inscription au programme

  @Column({ type: 'datetime', nullable: true })
  lastPointsEarnedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  lastRedemptionAt: Date;

  @Column({ type: 'datetime', nullable: true })
  lastActivityAt: Date;

  // Anniversaire (pour bonus)
  @Column({ type: 'datetime', nullable: true })
  birthday: Date;

  @Column({ type: 'boolean', default: false })
  birthdayBonusClaimedThisYear: boolean;

  // Parrainage
  @Column({ type: 'varchar', length: 20, nullable: true })
  referralCode: string; // Code de parrainage unique

  @Column({ type: 'int', nullable: true })
  referredBy: number; // ID du parrain

  @Column({ type: 'int', default: 0 })
  totalReferrals: number; // Nombre de filleuls

  @Column({ type: 'int', default: 0 })
  totalReferralPoints: number; // Points gagnés via parrainage

  // Préférences
  @Column({ type: 'boolean', default: true })
  emailNotifications: boolean;

  @Column({ type: 'boolean', default: true })
  smsNotifications: boolean;

  @Column({ type: 'boolean', default: true })
  pushNotifications: boolean;

  // Statut
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'datetime', nullable: true })
  suspendedAt: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  suspensionReason: string;

  // Notes
  @Column({ type: 'text', nullable: true })
  notes: string;

  // Métadonnées
  @Column({ type: 'text', nullable: true })
  metadata: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
