// src/deliveries/entities/delivery.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Order } from '../../orders/entities/order.entity';

export enum DeliveryStatus {
  PENDING = 'PENDING',           // En attente d'assignation
  ASSIGNED = 'ASSIGNED',         // Assignée à un livreur
  PICKED_UP = 'PICKED_UP',       // Récupérée au magasin
  IN_TRANSIT = 'IN_TRANSIT',     // En cours de livraison
  ARRIVED = 'ARRIVED',           // Arrivée à destination
  DELIVERED = 'DELIVERED',       // Livrée avec succès
  FAILED = 'FAILED',             // Échec de livraison
  RETURNED = 'RETURNED',         // Retournée
  CANCELLED = 'CANCELLED',       // Annulée
}

export enum DeliveryPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

@Entity('deliveries')
export class Delivery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column({ unique: true })
  trackingNumber: string;

  @Column()
  orderId: string;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  // Livreur assigné
  @Column({ nullable: true })
  deliveryPersonId: string;

  @Column({ nullable: true })
  deliveryPersonName: string;

  @Column({ nullable: true })
  deliveryPersonPhone: string;

  // Statut
  @Column({
    type: 'varchar',
    default: DeliveryStatus.PENDING,
  })
  status: DeliveryStatus;

  @Column({
    type: 'varchar',
    default: DeliveryPriority.NORMAL,
  })
  priority: DeliveryPriority;

  // Adresse de livraison
  @Column()
  recipientName: string;

  @Column()
  recipientPhone: string;

  @Column({ type: 'text' })
  deliveryAddress: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  postalCode: string;

  @Column({ nullable: true })
  latitude: number;

  @Column({ nullable: true })
  longitude: number;

  // Dates planifiées
  @Column({ type: 'timestamp', nullable: true })
  scheduledDate: Date;

  @Column({ nullable: true })
  scheduledTimeSlot: string; // "09:00-12:00", "14:00-18:00"

  // Dates réelles
  @Column({ type: 'timestamp', nullable: true })
  assignedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  pickedUpAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date;

  // Preuve de livraison
  @Column({ nullable: true })
  signatureUrl: string;

  @Column({ nullable: true })
  photoUrl: string;

  @Column({ nullable: true })
  receivedBy: string;

  // Échec / Retour
  @Column({ nullable: true })
  failureReason: string;

  @Column({ default: 0 })
  attemptCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastAttemptAt: Date;

  // Frais et distance
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  deliveryFee: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  distance: number; // en km

  @Column({ nullable: true })
  estimatedDuration: number; // en minutes

  // Notes
  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'text', nullable: true })
  specialInstructions: string;

  // Historique des statuts (JSON)
  @Column({ type: 'simple-json', nullable: true })
  statusHistory: Array<{
    status: DeliveryStatus;
    timestamp: string;
    note?: string;
    location?: { lat: number; lng: number };
  }>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  createdBy: string;
}
