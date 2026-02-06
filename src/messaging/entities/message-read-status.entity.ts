// src/messaging/entities/message-read-status.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Conversation } from './conversation.entity';

@Entity('message_read_status')
@Unique(['conversationId', 'userId'])
export class MessageReadStatus {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  conversationId: number;

  @ManyToOne(() => Conversation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;

  @Column({ type: 'int' })
  userId: number;

  @Column({ type: 'varchar', length: 100 })
  userName: string;

  @Column({ type: 'int', default: 0 })
  lastReadMessageId: number;

  @Column({ type: 'int', default: 0 })
  unreadCount: number;

  @Column({ type: 'datetime', nullable: true })
  lastReadAt: Date | null;

  @Column({ type: 'boolean', default: false })
  isMuted: boolean;

  @Column({ type: 'datetime', nullable: true })
  mutedUntil: Date | null;

  @Column({ type: 'boolean', default: false })
  isPinned: boolean;

  @Column({ type: 'boolean', default: false })
  isArchived: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true })
  tenantId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
