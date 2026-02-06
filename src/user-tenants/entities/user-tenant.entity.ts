// src/user-tenants/entities/user-tenant.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

export enum MembershipStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING = 'PENDING',
}

export enum JoinedVia {
  CREATED = 'CREATED', // Le user a créé le tenant (PDG)
  INVITATION = 'INVITATION',
  JOIN_REQUEST = 'JOIN_REQUEST',
  MIGRATED = 'MIGRATED',
  ADMIN_ADDED = 'ADMIN_ADDED',
}

@Entity('user_tenants')
@Unique(['userId', 'tenantId'])
@Index(['userId'])
@Index(['tenantId'])
@Index(['status'])
export class UserTenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ default: 'VENDEUR' })
  role: string;

  @Column({ name: 'store_id', nullable: true })
  storeId: string;

  @Column({ default: 'ACTIVE' })
  status: string;

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @Column({ name: 'joined_via', nullable: true })
  joinedVia: string;

  @Column({ name: 'invitation_id', nullable: true })
  invitationId: string;

  @Column({ name: 'join_request_id', nullable: true })
  joinRequestId: string;

  @Column({ name: 'joined_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  joinedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
