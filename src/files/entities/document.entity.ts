// src/files/entities/document.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum DocumentType {
  INVOICE = 'INVOICE',
  RECEIPT = 'RECEIPT',
  CONTRACT = 'CONTRACT',
  PURCHASE_ORDER = 'PURCHASE_ORDER',
  DELIVERY_NOTE = 'DELIVERY_NOTE',
  QUOTE = 'QUOTE',
  REPORT = 'REPORT',
  CERTIFICATE = 'CERTIFICATE',
  LICENSE = 'LICENSE',
  ID_DOCUMENT = 'ID_DOCUMENT',
  BANK_STATEMENT = 'BANK_STATEMENT',
  TAX_DOCUMENT = 'TAX_DOCUMENT',
  OTHER = 'OTHER',
}

export enum DocumentStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ARCHIVED = 'ARCHIVED',
  EXPIRED = 'EXPIRED',
}

@Entity('documents')
@Index(['tenantId', 'documentType'])
@Index(['status'])
@Index(['relatedEntityType', 'relatedEntityId'])
export class Document {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  @Index()
  tenantId: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  documentCode: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  documentNumber: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 50 })
  documentType: DocumentType;

  @Column({ type: 'varchar', length: 50, default: DocumentStatus.DRAFT })
  status: DocumentStatus;

  @Column({ type: 'integer', nullable: true })
  fileId: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  fileName: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  filePath: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  fileUrl: string;

  @Column({ type: 'integer', nullable: true })
  fileSize: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  mimeType: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  relatedEntityType: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  relatedEntityId: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  relatedEntityName: string;

  @Column({ type: 'datetime', nullable: true })
  documentDate: Date;

  @Column({ type: 'datetime', nullable: true })
  expiryDate: Date;

  @Column({ type: 'datetime', nullable: true })
  effectiveDate: Date;

  @Column({ type: 'varchar', length: 10, default: 'XOF' })
  currency: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  amount: number;

  @Column({ type: 'varchar', length: 200, nullable: true })
  issuedBy: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  issuedTo: string;

  @Column({ type: 'text', nullable: true })
  tags: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'text', nullable: true })
  metadata: string;

  @Column({ type: 'integer', nullable: true })
  createdBy: number;

  @Column({ type: 'varchar', length: 200, nullable: true })
  createdByName: string;

  @Column({ type: 'integer', nullable: true })
  approvedBy: number;

  @Column({ type: 'varchar', length: 200, nullable: true })
  approvedByName: string;

  @Column({ type: 'datetime', nullable: true })
  approvedAt: Date;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ type: 'boolean', default: false })
  isConfidential: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'integer', default: 1 })
  version: number;

  @Column({ type: 'integer', default: 0 })
  downloadCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

