// src/messaging/entities/conversation.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Message } from './message.entity';
import { User } from '../../users/entities/user.entity';

export enum ConversationType {
  PRIVATE = 'PRIVATE',       // 1-to-1
  GROUP = 'GROUP',           // Multiple users
  BROADCAST = 'BROADCAST',   // Announcements
  SUPPORT = 'SUPPORT',       // Support tickets
}

export enum ConversationStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  CLOSED = 'CLOSED',
}

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: ConversationType.PRIVATE,
  })
  type: ConversationType;

  @Column({
    type: 'varchar',
    length: 20,
    default: ConversationStatus.ACTIVE,
  })
  status: ConversationStatus;

  @Column({ type: 'int' })
  createdById: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  createdByName: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  tenantId: string | null;

  @Column({ type: 'text', nullable: true })
  participantIds: string | null; // JSON array of user IDs

  @Column({ type: 'int', default: 0 })
  messageCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastMessageAt: Date | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  lastMessagePreview: string | null;

  @Column({ type: 'int', nullable: true })
  lastMessageById: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  lastMessageByName: string | null;

  @Column({ type: 'text', nullable: true })
  metadata: string | null; // JSON for custom data

  @Column({ type: 'boolean', default: false })
  isPinned: boolean;

  @Column({ type: 'boolean', default: false })
  isMuted: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helpers
  getParticipantIds(): number[] {
    if (!this.participantIds) return [];
    try {
      return JSON.parse(this.participantIds);
    } catch {
      return [];
    }
  }

  setParticipantIds(ids: number[]): void {
    this.participantIds = JSON.stringify(ids);
  }

  getMetadata(): Record<string, any> {
    if (!this.metadata) return {};
    try {
      return JSON.parse(this.metadata);
    } catch {
      return {};
    }
  }
}
