// src/exports/entities/export-job.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ExportFormat {
  PDF = 'PDF',
  EXCEL = 'EXCEL',
  CSV = 'CSV',
  JSON = 'JSON',
}

export enum ExportType {
  ORDERS = 'ORDERS',
  PRODUCTS = 'PRODUCTS',
  CUSTOMERS = 'CUSTOMERS',
  INVENTORY = 'INVENTORY',
  TRANSACTIONS = 'TRANSACTIONS',
  SALES_REPORT = 'SALES_REPORT',
  INVOICE = 'INVOICE',
  DELIVERY_NOTE = 'DELIVERY_NOTE',
  STOCK_REPORT = 'STOCK_REPORT',
  SUPPLIER_REPORT = 'SUPPLIER_REPORT',
}

export enum JobStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

@Entity('export_jobs')
export class ExportJob {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'job_code', unique: true })
  jobCode: string;

  @Column({ name: 'tenant_id', nullable: true })
  tenantId: string;

  @Column({ type: 'varchar', length: 50 })
  type: ExportType;

  @Column({ type: 'varchar', length: 20 })
  format: ExportFormat;

  @Column({ type: 'varchar', length: 20, default: JobStatus.PENDING })
  status: JobStatus;

  @Column({ name: 'file_name', nullable: true })
  fileName: string;

  @Column({ name: 'file_path', nullable: true })
  filePath: string;

  @Column({ name: 'file_size', type: 'integer', default: 0 })
  fileSize: number;

  @Column({ name: 'mime_type', nullable: true })
  mimeType: string;

  @Column({ name: 'filters_json', type: 'text', nullable: true })
  filtersJson: string;

  @Column({ name: 'columns_json', type: 'text', nullable: true })
  columnsJson: string;

  @Column({ name: 'total_records', type: 'integer', default: 0 })
  totalRecords: number;

  @Column({ name: 'processed_records', type: 'integer', default: 0 })
  processedRecords: number;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @Column({ name: 'download_count', type: 'integer', default: 0 })
  downloadCount: number;

  @Column({ name: 'expires_at', nullable: true })
  expiresAt: Date;

  @Column({ name: 'requested_by' })
  requestedBy: number;

  @Column({ name: 'requested_by_name', nullable: true })
  requestedByName: string;

  @Column({ name: 'started_at', nullable: true })
  startedAt: Date;

  @Column({ name: 'completed_at', nullable: true })
  completedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
