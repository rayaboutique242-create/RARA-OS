// src/tenants/entities/promo-code-redemption.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { PromoCode } from './promo-code.entity';

@Entity('saas_promo_code_redemptions')
@Index(['tenantId'])
@Index(['promoCodeId'])
@Index(['tenantId', 'promoCodeId'], { unique: true })
export class PromoCodeRedemption {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  promoCodeId: number;

  @ManyToOne(() => PromoCode, (promo) => promo.redemptions)
  @JoinColumn({ name: 'promoCodeId' })
  promoCode: PromoCode;

  @Column({ type: 'varchar', length: 50 })
  tenantId: string;

  // Utilisateur qui a utilisé le code
  @Column({ type: 'int' })
  redeemedBy: number;

  // Plan avant utilisation
  @Column({ type: 'varchar', length: 30, nullable: true })
  previousPlan: string;

  // Plan après utilisation
  @Column({ type: 'varchar', length: 30 })
  newPlan: string;

  // Date de début de l'abonnement accordé
  @Column({ type: 'timestamp' })
  subscriptionStartDate: Date;

  // Date de fin de l'abonnement accordé
  @Column({ type: 'timestamp', nullable: true })
  subscriptionEndDate: Date | null;

  // ID de la souscription créée
  @Column({ type: 'int', nullable: true })
  subscriptionId: number;

  // IP de l'utilisateur
  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress: string;

  // User agent
  @Column({ type: 'text', nullable: true })
  userAgent: string;

  @CreateDateColumn()
  redeemedAt: Date;
}
