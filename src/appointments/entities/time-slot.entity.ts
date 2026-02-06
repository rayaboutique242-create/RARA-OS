// src/appointments/entities/time-slot.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum DayOfWeek {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY',
}

@Entity('time_slots')
export class TimeSlot {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 20 })
  dayOfWeek: DayOfWeek;

  @Column({ type: 'varchar', length: 10 })
  startTime: string; // Format: "HH:mm"

  @Column({ type: 'varchar', length: 10 })
  endTime: string; // Format: "HH:mm"

  @Column({ type: 'int', default: 1 })
  maxAppointments: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', nullable: true })
  serviceOfferingId: number | null;

  @Column({ type: 'int', nullable: true })
  staffId: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  staffName: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  tenantId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
