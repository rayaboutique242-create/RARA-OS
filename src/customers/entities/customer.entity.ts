// src/customers/entities/customer.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Order } from '../../orders/entities/order.entity';

export enum CustomerStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  BLOCKED = 'BLOCKED',
  VIP = 'VIP',
}

export enum CustomerType {
  INDIVIDUAL = 'INDIVIDUAL',
  BUSINESS = 'BUSINESS',
  WHOLESALE = 'WHOLESALE',
}

export enum LoyaltyTier {
  BRONZE = 'BRONZE',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
  PLATINUM = 'PLATINUM',
}

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column({ unique: true })
  customerCode: string;

  // Informations personnelles
  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ nullable: true, unique: true })
  email: string;

  @Column()
  phone: string;

  @Column({ nullable: true })
  secondaryPhone: string;

  @Column({ nullable: true })
  dateOfBirth: Date;

  @Column({ nullable: true })
  gender: string;

  // Adresse principale
  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  postalCode: string;

  @Column({ nullable: true })
  country: string;

  // Adresse de livraison (si différente)
  @Column({ type: 'text', nullable: true })
  shippingAddress: string;

  @Column({ nullable: true })
  shippingCity: string;

  @Column({ nullable: true })
  shippingPostalCode: string;

  // Informations entreprise (pour B2B)
  @Column({ nullable: true })
  companyName: string;

  @Column({ nullable: true })
  taxId: string;

  @Column({ nullable: true })
  businessRegNumber: string;

  // Classification
  @Column({
    type: 'varchar',
    default: CustomerStatus.ACTIVE,
  })
  status: CustomerStatus;

  @Column({
    type: 'varchar',
    default: CustomerType.INDIVIDUAL,
  })
  customerType: CustomerType;

  // Programme de fidélité
  @Column({
    type: 'varchar',
    default: LoyaltyTier.BRONZE,
  })
  loyaltyTier: LoyaltyTier;

  @Column({ type: 'integer', default: 0 })
  loyaltyPoints: number;

  @Column({ type: 'integer', default: 0 })
  totalPointsEarned: number;

  @Column({ type: 'integer', default: 0 })
  totalPointsRedeemed: number;

  // Statistiques d'achat
  @Column({ type: 'integer', default: 0 })
  totalOrders: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalSpent: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  averageOrderValue: number;

  @Column({ nullable: true })
  lastOrderDate: Date;

  @Column({ nullable: true })
  lastOrderId: string;

  // Préférences
  @Column({ nullable: true })
  preferredLanguage: string;

  @Column({ nullable: true })
  preferredPaymentMethod: string;

  @Column({ default: true })
  acceptsMarketing: boolean;

  @Column({ default: false })
  acceptsSms: boolean;

  // Remises spéciales
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  specialDiscount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  creditLimit: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  currentCredit: number;

  // Notes et tags
  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  // Source d'acquisition
  @Column({ nullable: true })
  source: string;

  @Column({ nullable: true })
  referredBy: string;

  // Relations
  @OneToMany(() => Order, (order) => order.id)
  orders: Order[];

  // Métadonnées
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  createdBy: string;

  // Propriété calculée pour le nom complet
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  // Propriété calculée pour vérifier si VIP
  get isVip(): boolean {
    return this.status === CustomerStatus.VIP || this.loyaltyTier === LoyaltyTier.PLATINUM;
  }
}
