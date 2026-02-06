// src/messaging/entities/user-presence.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

export enum PresenceStatus {
  ONLINE = 'ONLINE',
  AWAY = 'AWAY',
  BUSY = 'BUSY',
  OFFLINE = 'OFFLINE',
  INVISIBLE = 'INVISIBLE',
}

@Entity('user_presence')
@Unique(['userId'])
export class UserPresence {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  userId: number;

  @Column({ type: 'varchar', length: 100 })
  userName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  userAvatar: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: PresenceStatus.OFFLINE,
  })
  status: PresenceStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  statusMessage: string | null; // Custom status message

  @Column({ type: 'timestamp', nullable: true })
  lastSeenAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  lastActiveAt: Date | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  currentDevice: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  currentIp: string | null;

  @Column({ type: 'boolean', default: true })
  showOnlineStatus: boolean;

  @Column({ type: 'boolean', default: true })
  showLastSeen: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true })
  tenantId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
