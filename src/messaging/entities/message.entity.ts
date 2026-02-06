// src/messaging/entities/message.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Conversation } from './conversation.entity';

export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  FILE = 'FILE',
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO',
  SYSTEM = 'SYSTEM',      // System notifications
  LINK = 'LINK',
}

export enum MessageStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED',
  DELETED = 'DELETED',
}

export enum MessagePriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  conversationId: number;

  @ManyToOne(() => Conversation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;

  @Column({ type: 'int' })
  senderId: number;

  @Column({ type: 'varchar', length: 100 })
  senderName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  senderAvatar: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: MessageType.TEXT,
  })
  type: MessageType;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'text', nullable: true })
  contentHtml: string | null; // Formatted content

  @Column({
    type: 'varchar',
    length: 20,
    default: MessageStatus.SENT,
  })
  status: MessageStatus;

  @Column({
    type: 'varchar',
    length: 20,
    default: MessagePriority.NORMAL,
  })
  priority: MessagePriority;

  @Column({ type: 'int', nullable: true })
  replyToId: number | null; // Parent message for replies

  @Column({ type: 'varchar', length: 500, nullable: true })
  replyToPreview: string | null;

  @Column({ type: 'text', nullable: true })
  attachments: string | null; // JSON array of attachments

  @Column({ type: 'text', nullable: true })
  mentions: string | null; // JSON array of mentioned user IDs

  @Column({ type: 'text', nullable: true })
  reactions: string | null; // JSON object {emoji: [userIds]}

  @Column({ type: 'text', nullable: true })
  readBy: string | null; // JSON array of {userId, readAt}

  @Column({ type: 'boolean', default: false })
  isEdited: boolean;

  @Column({ type: 'timestamp', nullable: true })
  editedAt: Date | null;

  @Column({ type: 'boolean', default: false })
  isForwarded: boolean;

  @Column({ type: 'int', nullable: true })
  forwardedFromId: number | null;

  @Column({ type: 'boolean', default: false })
  isPinned: boolean;

  @Column({ type: 'timestamp', nullable: true })
  scheduledAt: Date | null; // For scheduled messages

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date | null; // For self-destructing messages

  @Column({ type: 'varchar', length: 50, nullable: true })
  tenantId: string | null;

  @Column({ type: 'text', nullable: true })
  metadata: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helpers
  getAttachments(): any[] {
    if (!this.attachments) return [];
    try {
      return JSON.parse(this.attachments);
    } catch {
      return [];
    }
  }

  getMentions(): number[] {
    if (!this.mentions) return [];
    try {
      return JSON.parse(this.mentions);
    } catch {
      return [];
    }
  }

  getReactions(): Record<string, number[]> {
    if (!this.reactions) return {};
    try {
      return JSON.parse(this.reactions);
    } catch {
      return {};
    }
  }

  getReadBy(): Array<{ userId: number; readAt: string }> {
    if (!this.readBy) return [];
    try {
      return JSON.parse(this.readBy);
    } catch {
      return [];
    }
  }
}
