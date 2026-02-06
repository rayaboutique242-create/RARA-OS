// src/files/files.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { File } from './entities/file.entity';
import { MediaFile } from './entities/media-file.entity';
import { Document } from './entities/document.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([File, MediaFile, Document]),
    MulterModule.register({
      storage: memoryStorage(),
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max
      },
      fileFilter: (req, file, callback) => {
        // Allow common file types
        const allowedMimes = [
          // Images
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'image/svg+xml',
          'image/bmp',
          'image/tiff',
          // Documents
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'text/plain',
          'text/csv',
          // Archives
          'application/zip',
          'application/x-rar-compressed',
          'application/x-7z-compressed',
          'application/gzip',
          // Videos
          'video/mp4',
          'video/mpeg',
          'video/quicktime',
          'video/x-msvideo',
          // Audio
          'audio/mpeg',
          'audio/wav',
          'audio/ogg',
        ];

        if (allowedMimes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(new Error(`Type de fichier non autorisé: ${file.mimetype}`), false);
        }
      },
    }),
  ],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
