// src/tenants/entities/tenant.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum TenantStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  TRIAL = 'TRIAL',
  EXPIRED = 'EXPIRED',
}

export enum SubscriptionPlan {
  FREE = 'FREE',
  STARTER = 'STARTER',
  PROFESSIONAL = 'PROFESSIONAL',
  ENTERPRISE = 'ENTERPRISE',
  CUSTOM = 'CUSTOM',
}

export enum BusinessType {
  BOUTIQUE = 'BOUTIQUE',
  SUPERMARKET = 'SUPERMARKET',
  WHOLESALE = 'WHOLESALE',
  PHARMACY = 'PHARMACY',
  RESTAURANT = 'RESTAURANT',
  BAKERY = 'BAKERY',
  CLOTHING = 'CLOTHING',
  ELECTRONICS = 'ELECTRONICS',
  COSMETICS = 'COSMETICS',
  GROCERY = 'GROCERY',
  OTHER = 'OTHER',
}

@Entity('tenants')
@Index(['status', 'subscriptionPlan'])
@Index(['businessType'])
export class Tenant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  tenantCode: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  legalName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  registrationNumber: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  taxId: string;

  @Column({ type: 'varchar', length: 50, default: 'BOUTIQUE' })
  businessType: string;

  @Column({ type: 'varchar', length: 50, default: 'TRIAL' })
  status: string;

  @Column({ type: 'varchar', length: 50, default: 'FREE' })
  subscriptionPlan: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phoneSecondary: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  website: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  state: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  postalCode: string;

  @Column({ type: 'varchar', length: 100, default: 'CI' })
  country: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  latitude: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  longitude: string;

  @Column({ type: 'varchar', length: 200 })
  ownerName: string;

  @Column({ type: 'varchar', length: 255 })
  ownerEmail: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  ownerPhone: string;

  @Column({ type: 'timestamp', nullable: true })
  subscriptionStartDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  subscriptionEndDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  trialEndDate: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  monthlyPrice: number;

  @Column({ type: 'varchar', length: 10, default: 'XOF' })
  billingCurrency: string;

  @Column({ type: 'varchar', length: 20, default: 'MONTHLY' })
  billingCycle: string;

  @Column({ type: 'integer', default: 5 })
  maxUsers: number;

  @Column({ type: 'integer', default: 100 })
  maxProducts: number;

  @Column({ type: 'integer', default: 1 })
  maxStores: number;

  @Column({ type: 'integer', default: 1000 })
  maxOrdersPerMonth: number;

  @Column({ type: 'integer', default: 1 })
  storageQuotaGB: number;

  @Column({ type: 'boolean', default: true })
  featureInventory: boolean;

  @Column({ type: 'boolean', default: true })
  featureOrders: boolean;

  @Column({ type: 'boolean', default: false })
  featureDelivery: boolean;

  @Column({ type: 'boolean', default: false })
  featureSuppliers: boolean;

  @Column({ type: 'boolean', default: false })
  featureAdvancedReports: boolean;

  @Column({ type: 'boolean', default: false })
  featurePromotions: boolean;

  @Column({ type: 'boolean', default: false })
  featureMultiStore: boolean;

  @Column({ type: 'boolean', default: false })
  featureApi: boolean;

  @Column({ type: 'boolean', default: false })
  featureAccounting: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true })
  logoUrl: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  faviconUrl: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  primaryColor: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  secondaryColor: string;

  @Column({ type: 'varchar', length: 10, default: 'fr' })
  defaultLanguage: string;

  @Column({ type: 'varchar', length: 50, default: 'Africa/Abidjan' })
  timezone: string;

  @Column({ type: 'varchar', length: 20, default: 'DD/MM/YYYY' })
  dateFormat: string;

  @Column({ type: 'text', nullable: true })
  customSettings: string;

  @Column({ type: 'integer', default: 0 })
  currentUsers: number;

  @Column({ type: 'integer', default: 0 })
  currentProducts: number;

  @Column({ type: 'integer', default: 0 })
  currentMonthOrders: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  storageUsedGB: number;

  @Column({ type: 'timestamp', nullable: true })
  lastActivityAt: Date;

  @Column({ type: 'text', nullable: true })
  internalNotes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
