// src/invitations/entities/join-request.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum JoinRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

@Entity('join_requests')
@Index(['tenantId', 'status'])
@Index(['userId'])
export class JoinRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'requested_role', default: 'VENDEUR' })
  requestedRole: string;

  @Column({ default: 'PENDING' })
  status: string;

  @Column({ type: 'text', nullable: true })
  message: string;

  @Column({ name: 'reviewed_by_user_id', nullable: true })
  reviewedByUserId: string;

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt: Date;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string;

  @Column({ name: 'assigned_role', nullable: true })
  assignedRole: string;

  @Column({ name: 'assigned_store_id', nullable: true })
  assignedStoreId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
