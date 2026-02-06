// src/support/entities/ticket-response.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

export enum ResponseType {
  REPLY = 'REPLY',
  NOTE = 'NOTE', // Internal note
  SYSTEM = 'SYSTEM', // Auto-generated
  STATUS_CHANGE = 'STATUS_CHANGE',
}

@Entity('ticket_responses')
export class TicketResponse {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  ticketId: number;

  @Column({ type: 'varchar', length: 20, default: ResponseType.REPLY })
  type: ResponseType;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'int' })
  authorId: number;

  @Column({ type: 'varchar', length: 100 })
  authorName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  authorEmail: string | null;

  @Column({ type: 'boolean', default: false })
  isFromSupport: boolean;

  @Column({ type: 'boolean', default: false })
  isInternal: boolean; // Only visible to support team

  @Column({ type: 'text', nullable: true })
  attachments: string | null; // JSON array

  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  // Helpers
  getAttachments(): string[] {
    if (!this.attachments) return [];
    try {
      return JSON.parse(this.attachments);
    } catch {
      return [];
    }
  }

  setAttachments(attachments: string[]): void {
    this.attachments = JSON.stringify(attachments);
  }
}
