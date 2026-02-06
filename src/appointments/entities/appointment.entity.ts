// src/appointments/entities/appointment.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ServiceOffering } from './service-offering.entity';

export enum AppointmentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  NO_SHOW = 'NO_SHOW',
  RESCHEDULED = 'RESCHEDULED',
}

export enum AppointmentSource {
  ONLINE = 'ONLINE',
  PHONE = 'PHONE',
  IN_STORE = 'IN_STORE',
  SOCIAL_MEDIA = 'SOCIAL_MEDIA',
}

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  appointmentNumber: string;

  @Column({ type: 'int' })
  serviceOfferingId: number;

  @ManyToOne(() => ServiceOffering)
  @JoinColumn({ name: 'serviceOfferingId' })
  serviceOffering: ServiceOffering;

  @Column({ type: 'varchar', length: 100 })
  serviceName: string;

  @Column({ type: 'int', nullable: true })
  customerId: number | null;

  @Column({ type: 'varchar', length: 100 })
  customerName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  customerEmail: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  customerPhone: string | null;

  @Column({ type: 'date' })
  appointmentDate: string;

  @Column({ type: 'varchar', length: 10 })
  startTime: string; // Format: "HH:mm"

  @Column({ type: 'varchar', length: 10 })
  endTime: string; // Format: "HH:mm"

  @Column({ type: 'int', default: 30 })
  durationMinutes: number;

  @Column({ type: 'varchar', length: 20, default: AppointmentStatus.PENDING })
  status: AppointmentStatus;

  @Column({ type: 'varchar', length: 20, default: AppointmentSource.IN_STORE })
  source: AppointmentSource;

  @Column({ type: 'int', nullable: true })
  staffId: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  staffName: string | null;

  @Column({ type: 'text', nullable: true })
  customerNotes: string | null;

  @Column({ type: 'text', nullable: true })
  staffNotes: string | null;

  @Column({ type: 'text', nullable: true })
  cancellationReason: string | null;

  @Column({ type: 'datetime', nullable: true })
  cancelledAt: Date | null;

  @Column({ type: 'int', nullable: true })
  cancelledById: number | null;

  @Column({ type: 'datetime', nullable: true })
  confirmedAt: Date | null;

  @Column({ type: 'int', nullable: true })
  confirmedById: number | null;

  @Column({ type: 'datetime', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'int', nullable: true })
  completedById: number | null;

  @Column({ type: 'int', nullable: true })
  rescheduledFromId: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  estimatedPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  depositPaid: number;

  @Column({ type: 'boolean', default: false })
  depositRequired: boolean;

  @Column({ type: 'boolean', default: false })
  reminderSent: boolean;

  @Column({ type: 'datetime', nullable: true })
  reminderSentAt: Date | null;

  @Column({ type: 'int', nullable: true })
  orderId: number | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  orderNumber: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  tenantId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
