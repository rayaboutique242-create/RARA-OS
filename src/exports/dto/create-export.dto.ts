// src/exports/dto/create-export.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
  IsArray,
  IsDateString,
} from 'class-validator';
import { ExportFormat, ExportType } from '../entities/export-job.entity';

export class ExportFiltersDto {
  @ApiPropertyOptional({ description: 'Date de début' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Date de fin' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Statut à filtrer' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Catégorie à filtrer' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Fournisseur à filtrer' })
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiPropertyOptional({ description: 'Recherche texte' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'IDs spécifiques à exporter' })
  @IsOptional()
  @IsArray()
  ids?: string[];
}

export class CreateExportDto {
  @ApiProperty({ enum: ExportType, description: 'Type de données à exporter' })
  @IsEnum(ExportType)
  type: ExportType;

  @ApiProperty({ enum: ExportFormat, description: 'Format de sortie', default: ExportFormat.EXCEL })
  @IsEnum(ExportFormat)
  format: ExportFormat;

  @ApiPropertyOptional({ description: 'Filtres à appliquer', type: ExportFiltersDto })
  @IsOptional()
  @IsObject()
  filters?: ExportFiltersDto;

  @ApiPropertyOptional({ description: 'Colonnes à inclure (par défaut: toutes)' })
  @IsOptional()
  @IsArray()
  columns?: string[];

  @ApiPropertyOptional({ description: 'Nom personnalisé du fichier' })
  @IsOptional()
  @IsString()
  customFileName?: string;
}

export class ExportInvoiceDto {
  @ApiProperty({ description: 'ID de la commande' })
  @IsString()
  orderId: string;

  @ApiPropertyOptional({ enum: ExportFormat, default: ExportFormat.PDF })
  @IsOptional()
  @IsEnum(ExportFormat)
  format?: ExportFormat;

  @ApiPropertyOptional({ description: 'Inclure le détail des produits' })
  @IsOptional()
  includeDetails?: boolean;
}

export class ExportDeliveryNoteDto {
  @ApiProperty({ description: 'ID de la livraison' })
  @IsString()
  deliveryId: string;

  @ApiPropertyOptional({ enum: ExportFormat, default: ExportFormat.PDF })
  @IsOptional()
  @IsEnum(ExportFormat)
  format?: ExportFormat;
}

export class BulkExportDto {
  @ApiProperty({ description: 'Liste des IDs à exporter' })
  @IsArray()
  ids: string[];

  @ApiProperty({ enum: ExportType })
  @IsEnum(ExportType)
  type: ExportType;

  @ApiPropertyOptional({ enum: ExportFormat, default: ExportFormat.EXCEL })
  @IsOptional()
  @IsEnum(ExportFormat)
  format?: ExportFormat;
}
