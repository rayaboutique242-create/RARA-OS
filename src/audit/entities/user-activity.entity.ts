// src/audit/entities/user-activity.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('user_activities')
@Index(['tenantId', 'userId', 'createdAt'])
@Index(['sessionId'])
export class UserActivity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  tenantId: string;

  @Column({ type: 'uuid', nullable: true })
  userId?: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({ type: 'varchar', length: 100, nullable: true })
  sessionId?: string;

  @Column({ type: 'varchar', length: 50 })
  activityType: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  module?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  page?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  feature?: string;

  @Column({ type: 'text', nullable: true })
  details?: string;

  @Column({ type: 'integer', nullable: true })
  duration?: number;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress?: string;

  @Column({ type: 'text', nullable: true })
  userAgent?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  deviceType?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  browser?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  os?: string;

  @CreateDateColumn()
  @Index()
  createdAt: Date;
}
