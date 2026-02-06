// src/files/dto/query-file.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FileType, FileCategory, StorageProvider } from '../entities/file.entity';

export class QueryFileDto {
  @ApiPropertyOptional({ description: 'Recherche par nom ou titre' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: FileType, description: 'Type de fichier' })
  @IsOptional()
  @IsEnum(FileType)
  fileType?: FileType;

  @ApiPropertyOptional({ enum: FileCategory, description: 'Catégorie' })
  @IsOptional()
  @IsEnum(FileCategory)
  category?: FileCategory;

  @ApiPropertyOptional({ enum: StorageProvider, description: 'Fournisseur de stockage' })
  @IsOptional()
  @IsEnum(StorageProvider)
  storageProvider?: StorageProvider;

  @ApiPropertyOptional({ description: 'Type entité liée' })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional({ description: 'ID entité liée' })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({ description: 'Extension de fichier' })
  @IsOptional()
  @IsString()
  extension?: string;

  @ApiPropertyOptional({ description: 'Type MIME' })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional({ description: 'Fichiers publics uniquement' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'Fichiers actifs uniquement', default: true })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Uploadé par (userId)' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  uploadedBy?: number;

  @ApiPropertyOptional({ description: 'Tags (séparés par virgule)' })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiPropertyOptional({ description: 'Taille minimum (bytes)' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minSize?: number;

  @ApiPropertyOptional({ description: 'Taille maximum (bytes)' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxSize?: number;

  @ApiPropertyOptional({ description: 'Date début création' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Date fin création' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Numéro de page', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Éléments par page', default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Tri par champ', default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Ordre de tri', enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
