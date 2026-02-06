// src/backup/entities/backup.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum BackupType {
  FULL = 'FULL',
  INCREMENTAL = 'INCREMENTAL',
  DIFFERENTIAL = 'DIFFERENTIAL',
  DATA_ONLY = 'DATA_ONLY',
  SCHEMA_ONLY = 'SCHEMA_ONLY',
}

export enum BackupStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  DELETED = 'DELETED',
}

export enum BackupTrigger {
  MANUAL = 'MANUAL',
  SCHEDULED = 'SCHEDULED',
  AUTO = 'AUTO',
  PRE_UPDATE = 'PRE_UPDATE',
}

@Entity('backups')
export class Backup {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  tenantId: string | null;

  @Column({ type: 'varchar', length: 100 })
  backupCode: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 20, default: BackupType.FULL })
  type: BackupType;

  @Column({ type: 'varchar', length: 20, default: BackupStatus.PENDING })
  status: BackupStatus;

  @Column({ type: 'varchar', length: 20, default: BackupTrigger.MANUAL })
  trigger: BackupTrigger;

  @Column({ type: 'varchar', length: 500, nullable: true })
  filePath: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  fileName: string | null;

  @Column({ type: 'integer', default: 0 })
  fileSize: number;

  @Column({ type: 'varchar', length: 64, nullable: true })
  checksum: string | null;

  @Column({ type: 'text', nullable: true })
  tablesIncluded: string | null; // JSON array

  @Column({ type: 'integer', default: 0 })
  recordsCount: number;

  @Column({ type: 'integer', default: 0 })
  tablesCount: number;

  @Column({ type: 'boolean', default: false })
  isEncrypted: boolean;

  @Column({ type: 'boolean', default: false })
  isCompressed: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true })
  errorMessage: string | null;

  @Column({ type: 'datetime', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'integer', nullable: true })
  durationMs: number | null;

  @Column({ type: 'datetime', nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  createdBy: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  createdByName: string | null;

  @CreateDateColumn()
  createdAt: Date;

  // Helpers
  getTablesIncluded(): string[] {
    return this.tablesIncluded ? JSON.parse(this.tablesIncluded) : [];
  }

  setTablesIncluded(tables: string[]): void {
    this.tablesIncluded = JSON.stringify(tables);
  }
}
