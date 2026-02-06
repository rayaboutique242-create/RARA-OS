// src/appointments/entities/blocked-time.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum BlockedTimeType {
  HOLIDAY = 'HOLIDAY',
  VACATION = 'VACATION',
  MAINTENANCE = 'MAINTENANCE',
  MEETING = 'MEETING',
  BREAK = 'BREAK',
  PERSONAL = 'PERSONAL',
  OTHER = 'OTHER',
}

@Entity('blocked_times')
export class BlockedTime {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  title: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 30, default: BlockedTimeType.OTHER })
  type: BlockedTimeType;

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date' })
  endDate: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  startTime: string | null; // null = all day

  @Column({ type: 'varchar', length: 10, nullable: true })
  endTime: string | null;

  @Column({ type: 'boolean', default: true })
  isAllDay: boolean;

  @Column({ type: 'boolean', default: false })
  isRecurring: boolean;

  @Column({ type: 'varchar', length: 20, nullable: true })
  recurringPattern: string | null; // DAILY, WEEKLY, MONTHLY, YEARLY

  @Column({ type: 'int', nullable: true })
  staffId: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  staffName: string | null;

  @Column({ type: 'boolean', default: true })
  appliesToAllStaff: boolean;

  @Column({ type: 'int' })
  createdById: number;

  @Column({ type: 'varchar', length: 100 })
  createdByName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  tenantId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
