// src/files/dto/query-document.dto.ts
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
import { DocumentType, DocumentStatus } from '../entities/document.entity';

export class QueryDocumentDto {
  @ApiPropertyOptional({ description: 'Recherche par titre ou numéro' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: DocumentType, description: 'Type de document' })
  @IsOptional()
  @IsEnum(DocumentType)
  documentType?: DocumentType;

  @ApiPropertyOptional({ enum: DocumentStatus, description: 'Statut' })
  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @ApiPropertyOptional({ description: 'Type entité liée' })
  @IsOptional()
  @IsString()
  relatedEntityType?: string;

  @ApiPropertyOptional({ description: 'ID entité liée' })
  @IsOptional()
  @IsString()
  relatedEntityId?: string;

  @ApiPropertyOptional({ description: 'Documents confidentiels' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isConfidential?: boolean;

  @ApiPropertyOptional({ description: 'Documents actifs', default: true })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Créé par (userId)' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  createdBy?: number;

  @ApiPropertyOptional({ description: 'Documents expirés' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  expired?: boolean;

  @ApiPropertyOptional({ description: 'Date début' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Date fin' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Montant minimum' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minAmount?: number;

  @ApiPropertyOptional({ description: 'Montant maximum' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxAmount?: number;

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
