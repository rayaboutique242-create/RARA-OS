// src/backup/entities/backup-schedule.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BackupType } from './backup.entity';

export enum ScheduleFrequency {
  HOURLY = 'HOURLY',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

@Entity('backup_schedules')
export class BackupSchedule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  tenantId: string | null;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'varchar', length: 20, default: BackupType.FULL })
  backupType: BackupType;

  @Column({ type: 'varchar', length: 20, default: ScheduleFrequency.DAILY })
  frequency: ScheduleFrequency;

  @Column({ type: 'varchar', length: 10, default: '02:00' })
  timeOfDay: string; // HH:MM format

  @Column({ type: 'integer', nullable: true })
  dayOfWeek: number | null; // 0-6 for weekly

  @Column({ type: 'integer', nullable: true })
  dayOfMonth: number | null; // 1-31 for monthly

  @Column({ type: 'integer', default: 30 })
  retentionDays: number;

  @Column({ type: 'integer', default: 10 })
  maxBackups: number;

  @Column({ type: 'boolean', default: true })
  compress: boolean;

  @Column({ type: 'boolean', default: false })
  encrypt: boolean;

  @Column({ type: 'text', nullable: true })
  tablesToInclude: string | null; // JSON array, null = all

  @Column({ type: 'text', nullable: true })
  tablesToExclude: string | null; // JSON array

  @Column({ type: 'timestamp', nullable: true })
  lastRunAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  nextRunAt: Date | null;

  @Column({ type: 'integer', default: 0 })
  successCount: number;

  @Column({ type: 'integer', default: 0 })
  failureCount: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  lastError: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  createdBy: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helpers
  getTablesToInclude(): string[] | null {
    return this.tablesToInclude ? JSON.parse(this.tablesToInclude) : null;
  }

  setTablesToInclude(tables: string[] | null): void {
    this.tablesToInclude = tables ? JSON.stringify(tables) : null;
  }

  getTablesToExclude(): string[] {
    return this.tablesToExclude ? JSON.parse(this.tablesToExclude) : [];
  }

  setTablesToExclude(tables: string[]): void {
    this.tablesToExclude = JSON.stringify(tables);
  }
}
