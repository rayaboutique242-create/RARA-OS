// src/audit/entities/data-change-history.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('data_change_history')
@Index(['tenantId', 'entityType', 'entityId'])
@Index(['tenantId', 'createdAt'])
@Index(['changedBy', 'createdAt'])
export class DataChangeHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  tenantId: string;

  @Column({ type: 'varchar', length: 100 })
  entityType: string;

  @Column({ type: 'varchar', length: 100 })
  entityId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  entityName?: string;

  @Column({ type: 'integer', default: 1 })
  version: number;

  @Column({ type: 'varchar', length: 50 })
  changeType: string;

  @Column({ type: 'uuid', nullable: true })
  changedBy?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'changedBy' })
  changedByUser?: User;

  @Column({ type: 'varchar', length: 100, nullable: true })
  changedByName?: string;

  @Column({ type: 'text', nullable: true })
  previousState?: string;

  @Column({ type: 'text', nullable: true })
  currentState?: string;

  @Column({ type: 'text', nullable: true })
  changedFields?: string;

  @Column({ type: 'text', nullable: true })
  fieldChanges?: string;

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress?: string;

  @CreateDateColumn()
  @Index()
  createdAt: Date;
}
