// src/files/entities/media-file.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum MediaStatus {
  UPLOADING = 'UPLOADING',
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  FAILED = 'FAILED',
  DELETED = 'DELETED',
}

export enum MediaVariant {
  ORIGINAL = 'ORIGINAL',
  THUMBNAIL = 'THUMBNAIL',
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  LARGE = 'LARGE',
  WEBP = 'WEBP',
  COMPRESSED = 'COMPRESSED',
}

@Entity('media_files')
@Index(['tenantId', 'status'])
@Index(['parentFileId'])
export class MediaFile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  @Index()
  tenantId: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  mediaCode: string;

  @Column({ type: 'integer', nullable: true })
  parentFileId: number;

  @Column({ type: 'varchar', length: 50, default: MediaVariant.ORIGINAL })
  variant: MediaVariant;

  @Column({ type: 'varchar', length: 255 })
  fileName: string;

  @Column({ type: 'varchar', length: 100 })
  mimeType: string;

  @Column({ type: 'integer' })
  size: number;

  @Column({ type: 'varchar', length: 500 })
  path: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  url: string;

  @Column({ type: 'integer', nullable: true })
  width: number;

  @Column({ type: 'integer', nullable: true })
  height: number;

  @Column({ type: 'integer', nullable: true })
  quality: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  format: string;

  @Column({ type: 'varchar', length: 50, default: MediaStatus.READY })
  status: MediaStatus;

  @Column({ type: 'text', nullable: true })
  processingError: string;

  @Column({ type: 'text', nullable: true })
  metadata: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
