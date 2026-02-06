// src/support/entities/support-ticket.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_CUSTOMER = 'WAITING_CUSTOMER',
  WAITING_SUPPORT = 'WAITING_SUPPORT',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum TicketCategory {
  GENERAL = 'GENERAL',
  TECHNICAL = 'TECHNICAL',
  BILLING = 'BILLING',
  ACCOUNT = 'ACCOUNT',
  FEATURE_REQUEST = 'FEATURE_REQUEST',
  BUG_REPORT = 'BUG_REPORT',
  OTHER = 'OTHER',
}

@Entity('support_tickets')
export class SupportTicket {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 20, unique: true })
  ticketNumber: string;

  @Column({ type: 'varchar', length: 255 })
  subject: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 20, default: TicketStatus.OPEN })
  status: TicketStatus;

  @Column({ type: 'varchar', length: 20, default: TicketPriority.MEDIUM })
  priority: TicketPriority;

  @Column({ type: 'varchar', length: 30, default: TicketCategory.GENERAL })
  category: TicketCategory;

  @Column({ type: 'varchar', length: 50, nullable: true })
  tenantId: string | null;

  // Customer info
  @Column({ type: 'int' })
  createdById: number;

  @Column({ type: 'varchar', length: 100 })
  createdByName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  createdByEmail: string | null;

  // Assigned support agent
  @Column({ type: 'int', nullable: true })
  assignedToId: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  assignedToName: string | null;

  // Conversation link
  @Column({ type: 'int', nullable: true })
  conversationId: number | null;

  // Tags for organization
  @Column({ type: 'text', nullable: true })
  tags: string | null; // JSON array

  // Attachments
  @Column({ type: 'text', nullable: true })
  attachments: string | null; // JSON array of file paths/urls

  // Response tracking
  @Column({ type: 'int', default: 0 })
  responseCount: number;

  @Column({ type: 'timestamp', nullable: true })
  firstResponseAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  lastResponseAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  closedAt: Date | null;

  // Customer satisfaction
  @Column({ type: 'int', nullable: true })
  satisfactionRating: number | null; // 1-5

  @Column({ type: 'text', nullable: true })
  satisfactionComment: string | null;

  // SLA tracking
  @Column({ type: 'int', nullable: true })
  slaResponseTimeMinutes: number | null;

  @Column({ type: 'int', nullable: true })
  slaResolutionTimeMinutes: number | null;

  @Column({ type: 'boolean', default: false })
  slaBreached: boolean;

  // Internal notes (visible only to support)
  @Column({ type: 'text', nullable: true })
  internalNotes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helpers
  getTags(): string[] {
    if (!this.tags) return [];
    try {
      return JSON.parse(this.tags);
    } catch {
      return [];
    }
  }

  setTags(tags: string[]): void {
    this.tags = JSON.stringify(tags);
  }

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
