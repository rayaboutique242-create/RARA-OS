// src/loyalty/entities/loyalty-tier.entity.ts
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

@Entity('loyalty_tiers')
export class LoyaltyTier {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  tierCode: string;

  @Column({ type: 'varchar', length: 50 })
  name: string; // Bronze, Silver, Gold, Platinum, Diamond

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  tenantId: string;

  // Seuils
  @Column({ type: 'int', default: 0 })
  minimumPoints: number; // Points minimum pour atteindre ce niveau

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  minimumSpend: number; // Dépenses minimum pour atteindre ce niveau

  @Column({ type: 'int', default: 0 })
  minimumOrders: number; // Nombre de commandes minimum

  // Avantages
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 1 })
  pointsMultiplier: number; // Multiplicateur de points (ex: 1.5x, 2x)

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  discountPercentage: number; // Réduction permanente

  @Column({ type: 'boolean', default: false })
  freeShipping: boolean; // Livraison gratuite

  @Column({ type: 'boolean', default: false })
  prioritySupport: boolean; // Support prioritaire

  @Column({ type: 'boolean', default: false })
  earlyAccess: boolean; // Accès anticipé aux ventes

  @Column({ type: 'boolean', default: false })
  exclusiveOffers: boolean; // Offres exclusives

  @Column({ type: 'int', default: 0 })
  birthdayBonusPoints: number; // Points bonus anniversaire pour ce niveau

  // Avantages personnalisés (JSON)
  @Column({ type: 'text', nullable: true })
  customBenefits: string; // ["Gift wrapping", "Extended returns"]

  // Apparence
  @Column({ type: 'varchar', length: 7, nullable: true })
  color: string; // #FFD700 pour Gold

  @Column({ type: 'varchar', length: 255, nullable: true })
  badgeUrl: string; // URL du badge

  @Column({ type: 'varchar', length: 50, nullable: true })
  icon: string; // Nom de l'icône

  // Ordre d'affichage
  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  // Période de maintien
  @Column({ type: 'int', default: 12 })
  retentionPeriodMonths: number; // Mois pour maintenir le niveau

  @Column({ type: 'int', default: 0 })
  pointsToMaintain: number; // Points à accumuler pour maintenir

  // Statut
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  // Relation avec le programme
  @Column({ type: 'int' })
  programId: number;

  @ManyToOne(() => LoyaltyProgram, (program) => program.tiers)
  @JoinColumn({ name: 'programId' })
  program: LoyaltyProgram;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
