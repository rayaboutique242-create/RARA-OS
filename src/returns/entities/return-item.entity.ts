// src/returns/entities/return-item.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ReturnRequest } from './return-request.entity';

export enum ItemCondition {
  NEW = 'NEW',               // Neuf, non utilisé
  LIKE_NEW = 'LIKE_NEW',     // Comme neuf
  GOOD = 'GOOD',             // Bon état
  FAIR = 'FAIR',             // État acceptable
  POOR = 'POOR',             // Mauvais état
  DAMAGED = 'DAMAGED',       // Endommagé
  DEFECTIVE = 'DEFECTIVE',   // Défectueux
}

export enum ItemDecision {
  PENDING = 'PENDING',       // En attente
  RESTOCK = 'RESTOCK',       // Remettre en stock
  DISCARD = 'DISCARD',       // Jeter
  REPAIR = 'REPAIR',         // Réparer
  DONATE = 'DONATE',         // Donner
  RETURN_SUPPLIER = 'RETURN_SUPPLIER', // Retourner au fournisseur
}

@Entity('return_items')
export class ReturnItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  returnRequestId: number;

  @ManyToOne(() => ReturnRequest, request => request.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'returnRequestId' })
  returnRequest: ReturnRequest;

  @Column({ type: 'int' })
  productId: number;

  @Column({ type: 'varchar', length: 50 })
  productSku: string;

  @Column({ type: 'varchar', length: 255 })
  productName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  productVariant: string | null;

  @Column({ type: 'int' })
  quantityOrdered: number;

  @Column({ type: 'int' })
  quantityReturned: number;

  @Column({ type: 'int', default: 0 })
  quantityReceived: number;

  @Column({ type: 'int', default: 0 })
  quantityAccepted: number;

  @Column({ type: 'int', default: 0 })
  quantityRejected: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  totalPrice: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  refundAmount: number;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  condition: ItemCondition | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: ItemDecision.PENDING,
  })
  decision: ItemDecision;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ type: 'text', nullable: true })
  inspectionNotes: string | null;

  @Column({ type: 'text', nullable: true })
  photos: string | null;

  @Column({ type: 'boolean', default: false })
  isRestocked: boolean;

  @Column({ type: 'timestamp', nullable: true })
  restockedAt: Date | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  tenantId: string | null;

  @CreateDateColumn()
  createdAt: Date;

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
