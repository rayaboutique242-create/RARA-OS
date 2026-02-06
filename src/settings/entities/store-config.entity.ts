// src/settings/entities/store-config.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum BusinessType {
  RETAIL = 'RETAIL',
  WHOLESALE = 'WHOLESALE',
  MIXED = 'MIXED',
  SERVICES = 'SERVICES',
  RESTAURANT = 'RESTAURANT',
  PHARMACY = 'PHARMACY',
  SUPERMARKET = 'SUPERMARKET',
}

export enum InventoryMethod {
  FIFO = 'FIFO',       // First In First Out
  LIFO = 'LIFO',       // Last In First Out
  WEIGHTED_AVERAGE = 'WEIGHTED_AVERAGE',
}

@Entity('store_configs')
export class StoreConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  tenantId: string;

  // === Informations Boutique ===
  @Column({ type: 'varchar', length: 150 })
  storeName: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  legalName: string;

  @Column({ type: 'varchar', length: 20, default: BusinessType.RETAIL })
  businessType: BusinessType;

  @Column({ type: 'varchar', length: 50, nullable: true })
  registrationNumber: string; // RCCM, NIF

  @Column({ type: 'varchar', length: 50, nullable: true })
  taxId: string; // Numéro de TVA

  @Column({ type: 'text', nullable: true })
  logo: string;

  @Column({ type: 'text', nullable: true })
  favicon: string;

  // === Coordonnées ===
  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  postalCode: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  mobile: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  website: string;

  // === Localisation ===
  @Column({ type: 'varchar', length: 10, default: 'fr' })
  defaultLanguage: string;

  @Column({ type: 'varchar', length: 50, default: 'Africa/Abidjan' })
  timezone: string;

  @Column({ type: 'varchar', length: 10, default: 'DD/MM/YYYY' })
  dateFormat: string;

  @Column({ type: 'varchar', length: 10, default: 'HH:mm' })
  timeFormat: string;

  // === Devise & Taxes ===
  @Column({ type: 'varchar', length: 3, default: 'XOF' })
  defaultCurrency: string;

  @Column({ type: 'boolean', default: true })
  taxEnabled: boolean;

  @Column({ type: 'boolean', default: true })
  pricesIncludeTax: boolean;

  @Column({ type: 'int', nullable: true })
  defaultTaxRateId: number;

  // === Inventaire ===
  @Column({ type: 'varchar', length: 20, default: InventoryMethod.FIFO })
  inventoryMethod: InventoryMethod;

  @Column({ type: 'boolean', default: true })
  trackInventory: boolean;

  @Column({ type: 'boolean', default: false })
  allowNegativeStock: boolean;

  @Column({ type: 'int', default: 10 })
  lowStockThreshold: number;

  @Column({ type: 'boolean', default: true })
  lowStockAlerts: boolean;

  // === Commandes ===
  @Column({ type: 'varchar', length: 20, default: 'CMD-' })
  orderPrefix: string;

  @Column({ type: 'int', default: 1 })
  orderStartNumber: number;

  @Column({ type: 'boolean', default: true })
  autoGenerateOrderNumber: boolean;

  @Column({ type: 'boolean', default: false })
  requireCustomerForOrder: boolean;

  @Column({ type: 'int', default: 30 })
  orderExpiryDays: number;

  // === Factures ===
  @Column({ type: 'varchar', length: 20, default: 'FAC-' })
  invoicePrefix: string;

  @Column({ type: 'int', default: 1 })
  invoiceStartNumber: number;

  @Column({ type: 'text', nullable: true })
  invoiceFooter: string;

  @Column({ type: 'text', nullable: true })
  invoiceTerms: string;

  // === Reçus ===
  @Column({ type: 'varchar', length: 20, default: 'REC-' })
  receiptPrefix: string;

  @Column({ type: 'text', nullable: true })
  receiptHeader: string;

  @Column({ type: 'text', nullable: true })
  receiptFooter: string;

  @Column({ type: 'boolean', default: true })
  printReceiptAutomatically: boolean;

  // === Heures d'ouverture ===
  @Column({ type: 'text', nullable: true })
  businessHours: string; // JSON: { monday: { open: "08:00", close: "18:00" }, ... }

  // === Réseaux sociaux ===
  @Column({ type: 'varchar', length: 255, nullable: true })
  facebookUrl: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  instagramUrl: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  twitterUrl: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  linkedinUrl: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  whatsappNumber: string;

  // === Thème & Apparence ===
  @Column({ type: 'varchar', length: 10, default: '#1976D2' })
  primaryColor: string;

  @Column({ type: 'varchar', length: 10, default: '#424242' })
  secondaryColor: string;

  @Column({ type: 'varchar', length: 20, default: 'light' })
  theme: string; // light, dark, auto

  // === Fonctionnalités ===
  @Column({ type: 'boolean', default: true })
  enablePOS: boolean;

  @Column({ type: 'boolean', default: true })
  enableEcommerce: boolean;

  @Column({ type: 'boolean', default: true })
  enableDelivery: boolean;

  @Column({ type: 'boolean', default: true })
  enableLoyaltyProgram: boolean;

  @Column({ type: 'boolean', default: true })
  enableMultipleLocations: boolean;

  @Column({ type: 'boolean', default: false })
  maintenanceMode: boolean;

  @Column({ type: 'text', nullable: true })
  maintenanceMessage: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
