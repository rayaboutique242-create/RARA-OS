// src/backup/entities/restore.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Backup } from './backup.entity';

export enum RestoreStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  ROLLED_BACK = 'ROLLED_BACK',
}

export enum RestoreMode {
  FULL = 'FULL',
  SELECTIVE = 'SELECTIVE',
  MERGE = 'MERGE',
}

@Entity('restores')
export class Restore {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  tenantId: string | null;

  @Column({ type: 'varchar', length: 100 })
  restoreCode: string;

  @Column({ type: 'integer' })
  backupId: number;

  @ManyToOne(() => Backup, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'backupId' })
  backup: Backup;

  @Column({ type: 'varchar', length: 20, default: RestoreStatus.PENDING })
  status: RestoreStatus;

  @Column({ type: 'varchar', length: 20, default: RestoreMode.FULL })
  mode: RestoreMode;

  @Column({ type: 'text', nullable: true })
  tablesRestored: string | null; // JSON array

  @Column({ type: 'integer', default: 0 })
  recordsRestored: number;

  @Column({ type: 'integer', default: 0 })
  tablesRestoredCount: number;

  @Column({ type: 'boolean', default: false })
  createBackupBefore: boolean;

  @Column({ type: 'integer', nullable: true })
  preRestoreBackupId: number | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  errorMessage: string | null;

  @Column({ type: 'datetime', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'integer', nullable: true })
  durationMs: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  initiatedBy: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  initiatedByName: string | null;

  @CreateDateColumn()
  createdAt: Date;

  // Helpers
  getTablesRestored(): string[] {
    return this.tablesRestored ? JSON.parse(this.tablesRestored) : [];
  }

  setTablesRestored(tables: string[]): void {
    this.tablesRestored = JSON.stringify(tables);
  }
}
