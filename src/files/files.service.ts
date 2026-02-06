// src/files/files.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between, LessThan, MoreThan } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { File, FileType, FileCategory, StorageProvider } from './entities/file.entity';
import { MediaFile, MediaStatus, MediaVariant } from './entities/media-file.entity';
import { Document, DocumentStatus } from './entities/document.entity';
import { UploadFileDto, UploadMultipleFilesDto } from './dto/upload-file.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { QueryFileDto } from './dto/query-file.dto';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto, ApproveDocumentDto, RejectDocumentDto } from './dto/update-document.dto';
import { QueryDocumentDto } from './dto/query-document.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FilesService {
  private readonly uploadDir: string;
  private readonly allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  private readonly allowedDocTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain', 'text/csv'];

  constructor(
    @InjectRepository(File)
    private fileRepository: Repository<File>,
    @InjectRepository(MediaFile)
    private mediaFileRepository: Repository<MediaFile>,
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    private configService: ConfigService,
  ) {
    this.uploadDir = this.configService.get<string>('UPLOAD_DIR', './uploads');
    this.ensureUploadDirExists();
  }

  private ensureUploadDirExists(): void {
    const dirs = [
      this.uploadDir,
      path.join(this.uploadDir, 'images'),
      path.join(this.uploadDir, 'documents'),
      path.join(this.uploadDir, 'thumbnails'),
      path.join(this.uploadDir, 'temp'),
    ];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  // ==================== FILE UPLOAD ====================

  async uploadFile(
    file: Express.Multer.File,
    tenantId: string,
    uploadDto: UploadFileDto,
    userId?: number,
    userName?: string,
  ): Promise<File> {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    const fileType = this.getFileType(file.mimetype);
    const extension = path.extname(file.originalname).toLowerCase().replace('.', '');
    const fileCode = this.generateFileCode();
    const fileName = `${fileCode}.${extension}`;
    const subDir = this.getSubDirectory(fileType);
    const filePath = path.join(this.uploadDir, subDir, tenantId);

    // Create tenant directory if not exists
    if (!fs.existsSync(filePath)) {
      fs.mkdirSync(filePath, { recursive: true });
    }

    const fullPath = path.join(filePath, fileName);
    fs.writeFileSync(fullPath, file.buffer);

    const checksum = this.calculateChecksum(file.buffer);
    const relativePath = path.join(subDir, tenantId, fileName).replace(/\\/g, '/');

    const newFile = this.fileRepository.create({
      tenantId,
      fileCode,
      originalName: file.originalname,
      fileName,
      fileType,
      category: uploadDto.category || FileCategory.OTHER,
      mimeType: file.mimetype,
      extension,
      size: file.size,
      path: relativePath,
      url: `/uploads/${relativePath}`,
      storageProvider: uploadDto.storageProvider || StorageProvider.LOCAL,
      entityType: uploadDto.entityType,
      entityId: uploadDto.entityId,
      title: uploadDto.title || file.originalname,
      description: uploadDto.description,
      altText: uploadDto.altText,
      tags: uploadDto.tags,
      checksum,
      uploadedBy: userId,
      uploadedByName: userName,
      isPublic: uploadDto.isPublic !== false,
    });

    // Get image dimensions if applicable
    if (fileType === FileType.IMAGE) {
      const dimensions = await this.getImageDimensions(fullPath);
      if (dimensions) {
        newFile.width = dimensions.width;
        newFile.height = dimensions.height;
      }

      // Generate thumbnail if requested
      if (uploadDto.generateThumbnail !== false) {
        await this.generateThumbnail(newFile, file.buffer, tenantId);
      }
    }

    return this.fileRepository.save(newFile);
  }

  async uploadMultipleFiles(
    files: Express.Multer.File[],
    tenantId: string,
    uploadDto: UploadMultipleFilesDto,
    userId?: number,
    userName?: string,
  ): Promise<File[]> {
    const uploadedFiles: File[] = [];

    for (const file of files) {
      const uploaded = await this.uploadFile(
        file,
        tenantId,
        {
          category: uploadDto.category,
          entityType: uploadDto.entityType,
          entityId: uploadDto.entityId,
          isPublic: uploadDto.isPublic,
        },
        userId,
        userName,
      );
      uploadedFiles.push(uploaded);
    }

    return uploadedFiles;
  }

  // ==================== FILE MANAGEMENT ====================

  async findAllFiles(tenantId: string, query: QueryFileDto) {
    const {
      search, fileType, category, storageProvider, entityType, entityId,
      extension, mimeType, isPublic, isActive, uploadedBy, tags,
      minSize, maxSize, startDate, endDate,
      page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'DESC',
    } = query;

    const qb = this.fileRepository.createQueryBuilder('file')
      .where('file.tenantId = :tenantId', { tenantId });

    if (search) {
      qb.andWhere('(file.originalName LIKE :search OR file.title LIKE :search OR file.fileName LIKE :search)', 
        { search: `%${search}%` });
    }

    if (fileType) qb.andWhere('file.fileType = :fileType', { fileType });
    if (category) qb.andWhere('file.category = :category', { category });
    if (storageProvider) qb.andWhere('file.storageProvider = :storageProvider', { storageProvider });
    if (entityType) qb.andWhere('file.entityType = :entityType', { entityType });
    if (entityId) qb.andWhere('file.entityId = :entityId', { entityId });
    if (extension) qb.andWhere('file.extension = :extension', { extension });
    if (mimeType) qb.andWhere('file.mimeType LIKE :mimeType', { mimeType: `%${mimeType}%` });
    if (isPublic !== undefined) qb.andWhere('file.isPublic = :isPublic', { isPublic });
    if (isActive !== undefined) qb.andWhere('file.isActive = :isActive', { isActive });
    if (uploadedBy) qb.andWhere('file.uploadedBy = :uploadedBy', { uploadedBy });
    if (tags) qb.andWhere('file.tags LIKE :tags', { tags: `%${tags}%` });
    if (minSize) qb.andWhere('file.size >= :minSize', { minSize });
    if (maxSize) qb.andWhere('file.size <= :maxSize', { maxSize });
    if (startDate) qb.andWhere('file.createdAt >= :startDate', { startDate });
    if (endDate) qb.andWhere('file.createdAt <= :endDate', { endDate });

    const total = await qb.getCount();

    qb.orderBy(`file.${sortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit);

    const files = await qb.getMany();

    return {
      data: files,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findFileById(id: number, tenantId: string): Promise<File> {
    const file = await this.fileRepository.findOne({
      where: { id, tenantId },
    });

    if (!file) {
      throw new NotFoundException(`Fichier #${id} non trouvé`);
    }

    // Update view count
    await this.fileRepository.update(id, {
      viewCount: () => 'viewCount + 1',
      lastAccessedAt: new Date(),
    });

    return file;
  }

  async findFileByCode(fileCode: string, tenantId: string): Promise<File> {
    const file = await this.fileRepository.findOne({
      where: { fileCode, tenantId },
    });

    if (!file) {
      throw new NotFoundException(`Fichier ${fileCode} non trouvé`);
    }

    return file;
  }

  async updateFile(id: number, tenantId: string, updateDto: UpdateFileDto): Promise<File> {
    const file = await this.findFileById(id, tenantId);

    Object.assign(file, updateDto);

    return this.fileRepository.save(file);
  }

  async deleteFile(id: number, tenantId: string): Promise<void> {
    const file = await this.findFileById(id, tenantId);

    // Delete physical file
    const fullPath = path.join(this.uploadDir, file.path);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    // Delete thumbnail if exists
    if (file.thumbnailPath) {
      const thumbPath = path.join(this.uploadDir, file.thumbnailPath);
      if (fs.existsSync(thumbPath)) {
        fs.unlinkSync(thumbPath);
      }
    }

    // Delete media variants
    await this.mediaFileRepository.delete({ parentFileId: id });

    await this.fileRepository.remove(file);
  }

  async getFilesByEntity(entityType: string, entityId: string, tenantId: string): Promise<File[]> {
    return this.fileRepository.find({
      where: { entityType, entityId, tenantId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async downloadFile(id: number, tenantId: string): Promise<{ file: File; buffer: Buffer }> {
    const file = await this.findFileById(id, tenantId);

    const fullPath = path.join(this.uploadDir, file.path);
    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException('Fichier physique non trouvé');
    }

    // Update download count
    await this.fileRepository.update(id, {
      downloadCount: () => 'downloadCount + 1',
      lastAccessedAt: new Date(),
    });

    const buffer = fs.readFileSync(fullPath);
    return { file, buffer };
  }

  // ==================== DOCUMENT MANAGEMENT ====================

  async createDocument(
    tenantId: string,
    createDto: CreateDocumentDto,
    userId?: number,
    userName?: string,
  ): Promise<Document> {
    const documentCode = this.generateDocumentCode();

    const document = this.documentRepository.create({
      tenantId,
      documentCode,
      ...createDto,
      documentDate: createDto.documentDate ? new Date(createDto.documentDate) : undefined,
      expiryDate: createDto.expiryDate ? new Date(createDto.expiryDate) : undefined,
      effectiveDate: createDto.effectiveDate ? new Date(createDto.effectiveDate) : undefined,
      createdBy: userId,
      createdByName: userName,
    });

    // If fileId provided, get file info
    if (createDto.fileId) {
      const file = await this.fileRepository.findOne({
        where: { id: createDto.fileId, tenantId },
      });
      if (file) {
        document.fileName = file.fileName;
        document.filePath = file.path;
        document.fileUrl = file.url;
        document.fileSize = file.size;
        document.mimeType = file.mimeType;
      }
    }

    return this.documentRepository.save(document);
  }

  async uploadDocument(
    file: Express.Multer.File,
    tenantId: string,
    createDto: CreateDocumentDto,
    userId?: number,
    userName?: string,
  ): Promise<Document> {
    // First upload the file
    const uploadedFile = await this.uploadFile(
      file,
      tenantId,
      {
        category: FileCategory.ATTACHMENT,
        title: createDto.title,
        description: createDto.description,
        isPublic: !createDto.isConfidential,
      },
      userId,
      userName,
    );

    // Then create the document linked to the file
    return this.createDocument(
      tenantId,
      {
        ...createDto,
        fileId: uploadedFile.id,
      },
      userId,
      userName,
    );
  }

  async findAllDocuments(tenantId: string, query: QueryDocumentDto) {
    const {
      search, documentType, status, relatedEntityType, relatedEntityId,
      isConfidential, isActive, createdBy, expired, startDate, endDate,
      minAmount, maxAmount,
      page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'DESC',
    } = query;

    const qb = this.documentRepository.createQueryBuilder('doc')
      .where('doc.tenantId = :tenantId', { tenantId });

    if (search) {
      qb.andWhere('(doc.title LIKE :search OR doc.documentNumber LIKE :search OR doc.description LIKE :search)', 
        { search: `%${search}%` });
    }

    if (documentType) qb.andWhere('doc.documentType = :documentType', { documentType });
    if (status) qb.andWhere('doc.status = :status', { status });
    if (relatedEntityType) qb.andWhere('doc.relatedEntityType = :relatedEntityType', { relatedEntityType });
    if (relatedEntityId) qb.andWhere('doc.relatedEntityId = :relatedEntityId', { relatedEntityId });
    if (isConfidential !== undefined) qb.andWhere('doc.isConfidential = :isConfidential', { isConfidential });
    if (isActive !== undefined) qb.andWhere('doc.isActive = :isActive', { isActive });
    if (createdBy) qb.andWhere('doc.createdBy = :createdBy', { createdBy });
    if (expired) qb.andWhere('doc.expiryDate < :now', { now: new Date() });
    if (startDate) qb.andWhere('doc.createdAt >= :startDate', { startDate });
    if (endDate) qb.andWhere('doc.createdAt <= :endDate', { endDate });
    if (minAmount) qb.andWhere('doc.amount >= :minAmount', { minAmount });
    if (maxAmount) qb.andWhere('doc.amount <= :maxAmount', { maxAmount });

    const total = await qb.getCount();

    qb.orderBy(`doc.${sortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit);

    const documents = await qb.getMany();

    return {
      data: documents,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findDocumentById(id: number, tenantId: string): Promise<Document> {
    const document = await this.documentRepository.findOne({
      where: { id, tenantId },
    });

    if (!document) {
      throw new NotFoundException(`Document #${id} non trouvé`);
    }

    return document;
  }

  async updateDocument(id: number, tenantId: string, updateDto: UpdateDocumentDto): Promise<Document> {
    const document = await this.findDocumentById(id, tenantId);

    if (updateDto.documentDate) {
      (updateDto as any).documentDate = new Date(updateDto.documentDate);
    }
    if (updateDto.expiryDate) {
      (updateDto as any).expiryDate = new Date(updateDto.expiryDate);
    }
    if (updateDto.effectiveDate) {
      (updateDto as any).effectiveDate = new Date(updateDto.effectiveDate);
    }

    Object.assign(document, updateDto);

    return this.documentRepository.save(document);
  }

  async approveDocument(
    id: number,
    tenantId: string,
    approveDto: ApproveDocumentDto,
    userId: number,
    userName: string,
  ): Promise<Document> {
    const document = await this.findDocumentById(id, tenantId);

    document.status = DocumentStatus.APPROVED;
    document.approvedBy = userId;
    document.approvedByName = userName;
    document.approvedAt = new Date();
    if (approveDto.notes) {
      document.notes = document.notes ? `${document.notes}\n${approveDto.notes}` : approveDto.notes;
    }

    return this.documentRepository.save(document);
  }

  async rejectDocument(
    id: number,
    tenantId: string,
    rejectDto: RejectDocumentDto,
    userId: number,
    userName: string,
  ): Promise<Document> {
    const document = await this.findDocumentById(id, tenantId);

    document.status = DocumentStatus.REJECTED;
    document.rejectionReason = rejectDto.reason || null;

    return this.documentRepository.save(document);
  }

  async archiveDocument(id: number, tenantId: string): Promise<Document> {
    const document = await this.findDocumentById(id, tenantId);

    document.status = DocumentStatus.ARCHIVED;

    return this.documentRepository.save(document);
  }

  async deleteDocument(id: number, tenantId: string): Promise<void> {
    const document = await this.findDocumentById(id, tenantId);

    // Delete associated file if exists
    if (document.fileId) {
      try {
        await this.deleteFile(document.fileId, tenantId);
      } catch (e) {
        // File might already be deleted
      }
    }

    await this.documentRepository.remove(document);
  }

  async getDocumentsByEntity(entityType: string, entityId: string, tenantId: string): Promise<Document[]> {
    return this.documentRepository.find({
      where: { relatedEntityType: entityType, relatedEntityId: entityId, tenantId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  // ==================== STATISTICS ====================

  async getStorageStats(tenantId: string) {
    const files = await this.fileRepository.find({ where: { tenantId } });

    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    const byType: Record<string, { count: number; size: number }> = {};
    const byCategory: Record<string, { count: number; size: number }> = {};

    files.forEach(f => {
      if (!byType[f.fileType]) byType[f.fileType] = { count: 0, size: 0 };
      byType[f.fileType].count++;
      byType[f.fileType].size += f.size;

      if (!byCategory[f.category]) byCategory[f.category] = { count: 0, size: 0 };
      byCategory[f.category].count++;
      byCategory[f.category].size += f.size;
    });

    return {
      totalFiles: files.length,
      totalSize,
      totalSizeMB: Math.round(totalSize / 1024 / 1024 * 100) / 100,
      byType,
      byCategory,
    };
  }

  async getDashboard(tenantId: string) {
    const [fileStats, documentStats] = await Promise.all([
      this.getStorageStats(tenantId),
      this.getDocumentStats(tenantId),
    ]);

    const recentFiles = await this.fileRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    const recentDocuments = await this.documentRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    return {
      storage: fileStats,
      documents: documentStats,
      recentFiles,
      recentDocuments,
    };
  }

  private async getDocumentStats(tenantId: string) {
    const documents = await this.documentRepository.find({ where: { tenantId } });

    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let expiredCount = 0;
    let expiringCount = 0;
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    documents.forEach(d => {
      byType[d.documentType] = (byType[d.documentType] || 0) + 1;
      byStatus[d.status] = (byStatus[d.status] || 0) + 1;
      if (d.expiryDate) {
        if (d.expiryDate < now) expiredCount++;
        else if (d.expiryDate < in30Days) expiringCount++;
      }
    });

    return {
      totalDocuments: documents.length,
      byType,
      byStatus,
      expiredCount,
      expiringCount,
    };
  }

  // ==================== HELPERS ====================

  private generateFileCode(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `FILE-${timestamp}-${random}`.toUpperCase();
  }

  private generateDocumentCode(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `DOC-${timestamp}-${random}`.toUpperCase();
  }

  private getFileType(mimeType: string): FileType {
    if (mimeType.startsWith('image/')) return FileType.IMAGE;
    if (mimeType.startsWith('video/')) return FileType.VIDEO;
    if (mimeType.startsWith('audio/')) return FileType.AUDIO;
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text') || mimeType.includes('spreadsheet')) {
      return FileType.DOCUMENT;
    }
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar') || mimeType.includes('gzip')) {
      return FileType.ARCHIVE;
    }
    return FileType.OTHER;
  }

  private getSubDirectory(fileType: FileType): string {
    switch (fileType) {
      case FileType.IMAGE: return 'images';
      case FileType.VIDEO: return 'videos';
      case FileType.AUDIO: return 'audio';
      case FileType.DOCUMENT: return 'documents';
      case FileType.ARCHIVE: return 'archives';
      default: return 'other';
    }
  }

  private calculateChecksum(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  private async getImageDimensions(filePath: string): Promise<{ width: number; height: number } | null> {
    // Simple implementation - in production use sharp or similar
    try {
      // Return null for now - can be enhanced with image library
      return null;
    } catch {
      return null;
    }
  }

  private async generateThumbnail(file: File, buffer: Buffer, tenantId: string): Promise<void> {
    // Simple implementation - in production use sharp
    try {
      const thumbDir = path.join(this.uploadDir, 'thumbnails', tenantId);
      if (!fs.existsSync(thumbDir)) {
        fs.mkdirSync(thumbDir, { recursive: true });
      }

      const thumbFileName = `thumb_${file.fileName}`;
      const thumbPath = path.join(thumbDir, thumbFileName);

      // For now, just copy the original (in production, resize with sharp)
      fs.writeFileSync(thumbPath, buffer);

      file.thumbnailPath = `thumbnails/${tenantId}/${thumbFileName}`;
      file.thumbnailUrl = `/uploads/thumbnails/${tenantId}/${thumbFileName}`;
    } catch (e) {
      // Thumbnail generation failed, continue without
    }
  }

  async cleanupExpiredFiles(tenantId: string): Promise<number> {
    const expiredFiles = await this.fileRepository.find({
      where: {
        tenantId,
        expiresAt: LessThan(new Date()),
      },
    });

    for (const file of expiredFiles) {
      await this.deleteFile(file.id, tenantId);
    }

    return expiredFiles.length;
  }
}
