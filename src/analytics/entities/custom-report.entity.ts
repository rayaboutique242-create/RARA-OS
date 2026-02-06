// src/analytics/entities/custom-report.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ReportType {
  SALES = 'SALES',
  INVENTORY = 'INVENTORY',
  CUSTOMERS = 'CUSTOMERS',
  PRODUCTS = 'PRODUCTS',
  FINANCIAL = 'FINANCIAL',
  PERFORMANCE = 'PERFORMANCE',
  CUSTOM = 'CUSTOM',
}

export enum ReportFormat {
  TABLE = 'TABLE',
  CHART_LINE = 'CHART_LINE',
  CHART_BAR = 'CHART_BAR',
  CHART_PIE = 'CHART_PIE',
  CHART_AREA = 'CHART_AREA',
  SUMMARY = 'SUMMARY',
  MIXED = 'MIXED',
}

export enum ReportSchedule {
  NONE = 'NONE',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

@Entity('custom_reports')
@Index(['tenantId', 'reportType'])
@Index(['tenantId', 'isPublic'])
export class CustomReport {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  reportCode: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  tenantId: string | null;

  @Column({ type: 'varchar', length: 30, default: ReportType.CUSTOM })
  reportType: ReportType;

  @Column({ type: 'varchar', length: 20, default: ReportFormat.TABLE })
  defaultFormat: ReportFormat;

  // Query configuration
  @Column({ type: 'text' })
  configJson: string;

  // Selected metrics/dimensions
  @Column({ type: 'text', nullable: true })
  metricsJson: string | null;

  @Column({ type: 'text', nullable: true })
  dimensionsJson: string | null;

  @Column({ type: 'text', nullable: true })
  filtersJson: string | null;

  // Date range defaults
  @Column({ type: 'varchar', length: 30, nullable: true })
  defaultDateRange: string | null;

  @Column({ type: 'boolean', default: false })
  comparePreviousPeriod: boolean;

  // Visualization settings
  @Column({ type: 'text', nullable: true })
  visualizationConfigJson: string | null;

  // Sharing & permissions
  @Column({ type: 'boolean', default: false })
  isPublic: boolean;

  @Column({ type: 'boolean', default: false })
  isFavorite: boolean;

  @Column({ type: 'text', nullable: true })
  sharedWithJson: string | null;

  // Scheduling
  @Column({ type: 'varchar', length: 20, default: ReportSchedule.NONE })
  schedule: ReportSchedule;

  @Column({ type: 'text', nullable: true })
  scheduleRecipientsJson: string | null;

  @Column({ type: 'datetime', nullable: true })
  lastSentAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  nextScheduledAt: Date | null;

  // Usage tracking
  @Column({ type: 'int', default: 0 })
  viewCount: number;

  @Column({ type: 'datetime', nullable: true })
  lastViewedAt: Date | null;

  @Column({ type: 'int', nullable: true })
  createdBy: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  createdByName: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
