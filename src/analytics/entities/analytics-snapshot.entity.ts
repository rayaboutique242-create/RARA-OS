// src/analytics/entities/analytics-snapshot.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum SnapshotType {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
}

export enum SnapshotCategory {
  SALES = 'SALES',
  INVENTORY = 'INVENTORY',
  CUSTOMERS = 'CUSTOMERS',
  PRODUCTS = 'PRODUCTS',
  FINANCIAL = 'FINANCIAL',
  PERFORMANCE = 'PERFORMANCE',
}

@Entity('analytics_snapshots')
@Index(['tenantId', 'snapshotDate', 'snapshotType'])
@Index(['tenantId', 'category', 'snapshotDate'])
export class AnalyticsSnapshot {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  snapshotCode: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  tenantId: string | null;

  @Column({ type: 'date' })
  snapshotDate: Date;

  @Column({ type: 'varchar', length: 20, default: SnapshotType.DAILY })
  snapshotType: SnapshotType;

  @Column({ type: 'varchar', length: 20, default: SnapshotCategory.SALES })
  category: SnapshotCategory;

  // Sales metrics
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalRevenue: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalCost: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  grossProfit: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  profitMargin: number;

  @Column({ type: 'int', default: 0 })
  totalOrders: number;

  @Column({ type: 'int', default: 0 })
  completedOrders: number;

  @Column({ type: 'int', default: 0 })
  cancelledOrders: number;

  @Column({ type: 'int', default: 0 })
  pendingOrders: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  averageOrderValue: number;

  @Column({ type: 'int', default: 0 })
  totalItemsSold: number;

  // Customer metrics
  @Column({ type: 'int', default: 0 })
  totalCustomers: number;

  @Column({ type: 'int', default: 0 })
  newCustomers: number;

  @Column({ type: 'int', default: 0 })
  returningCustomers: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  customerRetentionRate: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  customerLifetimeValue: number;

  // Inventory metrics
  @Column({ type: 'int', default: 0 })
  totalProducts: number;

  @Column({ type: 'int', default: 0 })
  lowStockProducts: number;

  @Column({ type: 'int', default: 0 })
  outOfStockProducts: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  inventoryValue: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  inventoryTurnoverRate: number;

  // Delivery metrics
  @Column({ type: 'int', default: 0 })
  totalDeliveries: number;

  @Column({ type: 'int', default: 0 })
  completedDeliveries: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  deliverySuccessRate: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  averageDeliveryTime: number;

  // Payment metrics
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  cashRevenue: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  mobileMoneyRevenue: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  cardRevenue: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  otherRevenue: number;

  // Promotion metrics
  @Column({ type: 'int', default: 0 })
  promotionsUsed: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalDiscounts: number;

  // Comparison with previous period
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  revenueGrowth: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  orderGrowth: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  customerGrowth: number;

  // Raw data JSON for detailed analysis
  @Column({ type: 'text', nullable: true })
  topProductsJson: string | null;

  @Column({ type: 'text', nullable: true })
  topCategoriesJson: string | null;

  @Column({ type: 'text', nullable: true })
  topCustomersJson: string | null;

  @Column({ type: 'text', nullable: true })
  hourlyDistributionJson: string | null;

  @Column({ type: 'text', nullable: true })
  additionalMetricsJson: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
