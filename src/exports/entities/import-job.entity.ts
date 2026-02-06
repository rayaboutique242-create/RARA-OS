// src/exports/entities/import-job.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ImportType {
  PRODUCTS = 'PRODUCTS',
  CUSTOMERS = 'CUSTOMERS',
  CATEGORIES = 'CATEGORIES',
  SUPPLIERS = 'SUPPLIERS',
  INVENTORY_ADJUSTMENT = 'INVENTORY_ADJUSTMENT',
  PRICE_UPDATE = 'PRICE_UPDATE',
}

export enum ImportStatus {
  PENDING = 'PENDING',
  VALIDATING = 'VALIDATING',
  VALIDATED = 'VALIDATED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  COMPLETED_WITH_ERRORS = 'COMPLETED_WITH_ERRORS',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

@Entity('import_jobs')
export class ImportJob {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'job_code', unique: true })
  jobCode: string;

  @Column({ name: 'tenant_id', nullable: true })
  tenantId: string;

  @Column({ type: 'varchar', length: 50 })
  type: ImportType;

  @Column({ type: 'varchar', length: 20, default: ImportStatus.PENDING })
  status: ImportStatus;

  @Column({ name: 'original_file_name' })
  originalFileName: string;

  @Column({ name: 'file_path', nullable: true })
  filePath: string;

  @Column({ name: 'file_size', type: 'integer', default: 0 })
  fileSize: number;

  @Column({ name: 'total_rows', type: 'integer', default: 0 })
  totalRows: number;

  @Column({ name: 'processed_rows', type: 'integer', default: 0 })
  processedRows: number;

  @Column({ name: 'success_count', type: 'integer', default: 0 })
  successCount: number;

  @Column({ name: 'error_count', type: 'integer', default: 0 })
  errorCount: number;

  @Column({ name: 'skip_count', type: 'integer', default: 0 })
  skipCount: number;

  @Column({ name: 'column_mapping_json', type: 'text', nullable: true })
  columnMappingJson: string;

  @Column({ name: 'validation_errors_json', type: 'text', nullable: true })
  validationErrorsJson: string;

  @Column({ name: 'import_options_json', type: 'text', nullable: true })
  importOptionsJson: string;

  @Column({ name: 'error_log_path', nullable: true })
  errorLogPath: string;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @Column({ name: 'dry_run', type: 'boolean', default: false })
  dryRun: boolean;

  @Column({ name: 'uploaded_by' })
  uploadedBy: number;

  @Column({ name: 'uploaded_by_name', nullable: true })
  uploadedByName: string;

  @Column({ name: 'started_at', nullable: true })
  startedAt: Date;

  @Column({ name: 'completed_at', nullable: true })
  completedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
