// src/files/entities/file.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum FileType {
  IMAGE = 'IMAGE',
  DOCUMENT = 'DOCUMENT',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  ARCHIVE = 'ARCHIVE',
  OTHER = 'OTHER',
}

export enum FileCategory {
  PRODUCT = 'PRODUCT',
  CATEGORY = 'CATEGORY',
  USER = 'USER',
  CUSTOMER = 'CUSTOMER',
  SUPPLIER = 'SUPPLIER',
  ORDER = 'ORDER',
  INVOICE = 'INVOICE',
  RECEIPT = 'RECEIPT',
  CONTRACT = 'CONTRACT',
  REPORT = 'REPORT',
  LOGO = 'LOGO',
  BANNER = 'BANNER',
  ATTACHMENT = 'ATTACHMENT',
  OTHER = 'OTHER',
}

export enum StorageProvider {
  LOCAL = 'LOCAL',
  S3 = 'S3',
  CLOUDINARY = 'CLOUDINARY',
  AZURE_BLOB = 'AZURE_BLOB',
  GOOGLE_CLOUD = 'GOOGLE_CLOUD',
}

@Entity('files')
@Index(['tenantId', 'category'])
@Index(['entityType', 'entityId'])
export class File {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  @Index()
  tenantId: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  fileCode: string;

  @Column({ type: 'varchar', length: 255 })
  originalName: string;

  @Column({ type: 'varchar', length: 255 })
  fileName: string;

  @Column({ type: 'varchar', length: 50 })
  @Index()
  fileType: FileType;

  @Column({ type: 'varchar', length: 50, default: FileCategory.OTHER })
  category: FileCategory;

  @Column({ type: 'varchar', length: 100 })
  mimeType: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  extension: string;

  @Column({ type: 'integer' })
  size: number;

  @Column({ type: 'varchar', length: 500 })
  path: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  url: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  thumbnailPath: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  thumbnailUrl: string;

  @Column({ type: 'varchar', length: 50, default: StorageProvider.LOCAL })
  storageProvider: StorageProvider;

  @Column({ type: 'varchar', length: 255, nullable: true })
  storageBucket: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  storageKey: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  entityType: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  entityId: string;

  @Column({ type: 'integer', nullable: true })
  width: number;

  @Column({ type: 'integer', nullable: true })
  height: number;

  @Column({ type: 'integer', nullable: true })
  duration: number;

  @Column({ type: 'varchar', length: 64, nullable: true })
  checksum: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  altText: string;

  @Column({ type: 'text', nullable: true })
  tags: string;

  @Column({ type: 'text', nullable: true })
  metadata: string;

  @Column({ type: 'integer', nullable: true })
  uploadedBy: number;

  @Column({ type: 'varchar', length: 200, nullable: true })
  uploadedByName: string;

  @Column({ type: 'boolean', default: true })
  isPublic: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'integer', default: 0 })
  downloadCount: number;

  @Column({ type: 'integer', default: 0 })
  viewCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastAccessedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
