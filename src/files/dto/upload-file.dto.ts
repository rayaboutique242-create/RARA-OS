// src/files/dto/upload-file.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  MaxLength,
} from 'class-validator';
import { FileCategory, StorageProvider } from '../entities/file.entity';

export class UploadFileDto {
  @ApiPropertyOptional({ description: 'Titre du fichier' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ description: 'Description du fichier' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Texte alternatif (images)' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  altText?: string;

  @ApiPropertyOptional({ enum: FileCategory, description: 'Catégorie du fichier' })
  @IsOptional()
  @IsEnum(FileCategory)
  category?: FileCategory;

  @ApiPropertyOptional({ description: 'Type entité liée (Product, Customer, etc.)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  entityType?: string;

  @ApiPropertyOptional({ description: 'ID entité liée' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  entityId?: string;

  @ApiPropertyOptional({ description: 'Tags séparés par virgule' })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiPropertyOptional({ description: 'Fichier public ou privé', default: true })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ enum: StorageProvider, description: 'Fournisseur de stockage' })
  @IsOptional()
  @IsEnum(StorageProvider)
  storageProvider?: StorageProvider;

  @ApiPropertyOptional({ description: 'Générer une miniature', default: true })
  @IsOptional()
  @IsBoolean()
  generateThumbnail?: boolean;
}

export class UploadMultipleFilesDto {
  @ApiPropertyOptional({ enum: FileCategory, description: 'Catégorie des fichiers' })
  @IsOptional()
  @IsEnum(FileCategory)
  category?: FileCategory;

  @ApiPropertyOptional({ description: 'Type entité liée' })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional({ description: 'ID entité liée' })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({ description: 'Fichiers publics', default: true })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
