// src/invitations/entities/invitation.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum InvitationType {
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  CODE = 'CODE',
  LINK = 'LINK',
  QR = 'QR',
}

@Entity('invitations')
@Index(['tenantId', 'status'])
@Index(['invitationCode'], { unique: true })
@Index(['invitationToken'], { unique: true })
export class Invitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'invited_by_user_id' })
  invitedByUserId: string;

  @Column({ name: 'invitation_code', length: 12 })
  invitationCode: string;

  @Column({ name: 'invitation_token', length: 64, nullable: true })
  invitationToken: string;

  @Column({ name: 'invitation_type', default: 'CODE' })
  invitationType: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ default: 'VENDEUR' })
  role: string;

  @Column({ name: 'store_id', nullable: true })
  storeId: string;

  @Column({ default: 'PENDING' })
  status: string;

  @Column({ type: 'text', nullable: true })
  message: string;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @Column({ name: 'accepted_at', type: 'timestamp', nullable: true })
  acceptedAt: Date;

  @Column({ name: 'accepted_by_user_id', nullable: true })
  acceptedByUserId: string;

  @Column({ name: 'max_uses', default: 1 })
  maxUses: number;

  @Column({ name: 'current_uses', default: 0 })
  currentUses: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
