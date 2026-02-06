// src/files/dto/create-document.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { DocumentType, DocumentStatus } from '../entities/document.entity';

export class CreateDocumentDto {
  @ApiProperty({ description: 'Titre du document' })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: DocumentType, description: 'Type de document' })
  @IsEnum(DocumentType)
  documentType: DocumentType;

  @ApiPropertyOptional({ description: 'Numéro de document' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  documentNumber?: string;

  @ApiPropertyOptional({ enum: DocumentStatus, description: 'Statut' })
  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @ApiPropertyOptional({ description: 'ID du fichier associé' })
  @IsOptional()
  @IsNumber()
  fileId?: number;

  @ApiPropertyOptional({ description: 'Type entité liée' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  relatedEntityType?: string;

  @ApiPropertyOptional({ description: 'ID entité liée' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  relatedEntityId?: string;

  @ApiPropertyOptional({ description: 'Nom entité liée' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  relatedEntityName?: string;

  @ApiPropertyOptional({ description: 'Date du document' })
  @IsOptional()
  @IsDateString()
  documentDate?: string;

  @ApiPropertyOptional({ description: 'Date expiration' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional({ description: 'Date effet' })
  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @ApiPropertyOptional({ description: 'Devise', default: 'XOF' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @ApiPropertyOptional({ description: 'Montant' })
  @IsOptional()
  @IsNumber()
  amount?: number;

  @ApiPropertyOptional({ description: 'Émis par' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  issuedBy?: string;

  @ApiPropertyOptional({ description: 'Émis à' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  issuedTo?: string;

  @ApiPropertyOptional({ description: 'Tags' })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Document confidentiel', default: false })
  @IsOptional()
  @IsBoolean()
  isConfidential?: boolean;
}
