// src/returns/entities/return-request.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ReturnItem } from './return-item.entity';

export enum ReturnStatus {
  PENDING = 'PENDING',           // En attente de validation
  APPROVED = 'APPROVED',         // Approuvé
  REJECTED = 'REJECTED',         // Rejeté
  RECEIVED = 'RECEIVED',         // Produits reçus
  INSPECTING = 'INSPECTING',     // En cours d'inspection
  PROCESSING = 'PROCESSING',     // En cours de traitement
  COMPLETED = 'COMPLETED',       // Terminé
  CANCELLED = 'CANCELLED',       // Annulé
}

export enum ReturnType {
  REFUND = 'REFUND',             // Remboursement
  EXCHANGE = 'EXCHANGE',         // Échange
  STORE_CREDIT = 'STORE_CREDIT', // Avoir
  REPAIR = 'REPAIR',             // Réparation
}

export enum ReturnReason {
  DEFECTIVE = 'DEFECTIVE',               // Produit défectueux
  WRONG_ITEM = 'WRONG_ITEM',             // Mauvais article reçu
  NOT_AS_DESCRIBED = 'NOT_AS_DESCRIBED', // Non conforme à la description
  CHANGED_MIND = 'CHANGED_MIND',         // Changement d'avis
  SIZE_ISSUE = 'SIZE_ISSUE',             // Problème de taille
  QUALITY_ISSUE = 'QUALITY_ISSUE',       // Problème de qualité
  DAMAGED = 'DAMAGED',                   // Endommagé à la réception
  LATE_DELIVERY = 'LATE_DELIVERY',       // Livraison tardive
  OTHER = 'OTHER',                       // Autre raison
}

@Entity('return_requests')
export class ReturnRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  returnNumber: string;

  @Column({ type: 'int' })
  orderId: number;

  @Column({ type: 'varchar', length: 50 })
  orderNumber: string;

  @Column({ type: 'int' })
  customerId: number;

  @Column({ type: 'varchar', length: 100 })
  customerName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  customerEmail: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  customerPhone: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: ReturnStatus.PENDING,
  })
  status: ReturnStatus;

  @Column({
    type: 'varchar',
    length: 20,
    default: ReturnType.REFUND,
  })
  type: ReturnType;

  @Column({
    type: 'varchar',
    length: 30,
    default: ReturnReason.OTHER,
  })
  reason: ReturnReason;

  @Column({ type: 'text', nullable: true })
  reasonDetails: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  refundAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  restockingFee: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  shippingRefund: number;

  @Column({ type: 'varchar', length: 10, default: 'XOF' })
  currency: string;

  @Column({ type: 'datetime', nullable: true })
  requestedAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  approvedAt: Date | null;

  @Column({ type: 'int', nullable: true })
  approvedById: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  approvedByName: string | null;

  @Column({ type: 'datetime', nullable: true })
  receivedAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  inspectionNotes: string | null;

  @Column({ type: 'text', nullable: true })
  adminNotes: string | null;

  @Column({ type: 'text', nullable: true })
  customerNotes: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  trackingNumber: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  carrier: string | null;

  @Column({ type: 'int', nullable: true })
  exchangeOrderId: number | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  exchangeOrderNumber: string | null;

  @Column({ type: 'int', nullable: true })
  storeCreditId: number | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  refundTransactionId: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  refundMethod: string | null;

  @Column({ type: 'text', nullable: true })
  photos: string | null; // JSON array of photo URLs

  @Column({ type: 'varchar', length: 50, nullable: true })
  tenantId: string | null;

  @Column({ type: 'text', nullable: true })
  metadata: string | null;

  @OneToMany(() => ReturnItem, item => item.returnRequest, { cascade: true })
  items: ReturnItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helpers
  getPhotos(): string[] {
    if (!this.photos) return [];
    try {
      return JSON.parse(this.photos);
    } catch {
      return [];
    }
  }
}
