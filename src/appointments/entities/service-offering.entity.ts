// src/appointments/entities/service-offering.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum ServiceCategory {
  CONSULTATION = 'CONSULTATION',
  FITTING = 'FITTING',
  ALTERATION = 'ALTERATION',
  PERSONAL_SHOPPING = 'PERSONAL_SHOPPING',
  STYLING = 'STYLING',
  MEASUREMENT = 'MEASUREMENT',
  PICKUP = 'PICKUP',
  RETURN = 'RETURN',
  CUSTOM_ORDER = 'CUSTOM_ORDER',
  OTHER = 'OTHER',
}

@Entity('service_offerings')
export class ServiceOffering {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 50, default: ServiceCategory.CONSULTATION })
  category: ServiceCategory;

  @Column({ type: 'int', default: 30 })
  durationMinutes: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: number;

  @Column({ type: 'varchar', length: 10, default: 'XOF' })
  currency: string;

  @Column({ type: 'boolean', default: false })
  isFree: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  requiresDeposit: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  depositAmount: number;

  @Column({ type: 'int', default: 1 })
  maxParticipants: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  imageUrl: string | null;

  @Column({ type: 'varchar', length: 50, default: '#3498db' })
  color: string;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'text', nullable: true })
  preparationNotes: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  tenantId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
