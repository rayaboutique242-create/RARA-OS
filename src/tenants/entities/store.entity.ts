// src/tenants/entities/store.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('stores')
@Index(['tenantId'])
@Index(['status'])
export class Store {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  tenantId: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  storeCode: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 50, default: 'MAIN' })
  type: string;

  @Column({ type: 'varchar', length: 50, default: 'ACTIVE' })
  status: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  district: string;

  @Column({ type: 'varchar', length: 100, default: 'CI' })
  country: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  latitude: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  longitude: string;

  @Column({ type: 'integer', nullable: true })
  managerId: number;

  @Column({ type: 'varchar', length: 200, nullable: true })
  managerName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  managerEmail: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  managerPhone: string;

  @Column({ type: 'text', nullable: true })
  openingHours: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  surfaceArea: number;

  @Column({ type: 'integer', default: 0 })
  employeeCount: number;

  @Column({ type: 'boolean', default: true })
  isPOS: boolean;

  @Column({ type: 'boolean', default: false })
  hasDelivery: boolean;

  @Column({ type: 'boolean', default: false })
  hasPickup: boolean;

  @Column({ type: 'boolean', default: true })
  managesStock: boolean;

  @Column({ type: 'boolean', default: false })
  isDefault: boolean;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  monthlySalesTarget: number;

  @Column({ type: 'varchar', length: 10, default: 'XOF' })
  currency: string;

  @Column({ type: 'integer', default: 0 })
  productCount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  currentMonthSales: number;

  @Column({ type: 'integer', default: 0 })
  currentMonthOrders: number;

  @Column({ type: 'datetime', nullable: true })
  lastSaleAt: Date;

  @Column({ type: 'text', nullable: true })
  customSettings: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
