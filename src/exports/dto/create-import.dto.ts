// src/exports/dto/create-import.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
  IsBoolean,
} from 'class-validator';
import { ImportType } from '../entities/import-job.entity';

export class ColumnMappingDto {
  @ApiProperty({ description: 'Nom de la colonne dans le fichier CSV' })
  @IsString()
  sourceColumn: string;

  @ApiProperty({ description: 'Nom du champ cible dans la base' })
  @IsString()
  targetField: string;

  @ApiPropertyOptional({ description: 'Transformation à appliquer' })
  @IsOptional()
  @IsString()
  transform?: string;

  @ApiPropertyOptional({ description: 'Valeur par défaut si vide' })
  @IsOptional()
  defaultValue?: any;
}

export class ImportOptionsDto {
  @ApiPropertyOptional({ description: 'Mettre à jour si existe (par SKU/email)', default: true })
  @IsOptional()
  @IsBoolean()
  updateExisting?: boolean;

  @ApiPropertyOptional({ description: 'Ignorer les erreurs et continuer', default: false })
  @IsOptional()
  @IsBoolean()
  skipErrors?: boolean;

  @ApiPropertyOptional({ description: 'Première ligne est l\'en-tête', default: true })
  @IsOptional()
  @IsBoolean()
  hasHeader?: boolean;

  @ApiPropertyOptional({ description: 'Délimiteur CSV', default: ',' })
  @IsOptional()
  @IsString()
  delimiter?: string;

  @ApiPropertyOptional({ description: 'Encodage du fichier', default: 'UTF-8' })
  @IsOptional()
  @IsString()
  encoding?: string;

  @ApiPropertyOptional({ description: 'Valider uniquement sans importer' })
  @IsOptional()
  @IsBoolean()
  validateOnly?: boolean;
}

export class CreateImportDto {
  @ApiProperty({ enum: ImportType, description: 'Type de données à importer' })
  @IsEnum(ImportType)
  type: ImportType;

  @ApiPropertyOptional({ description: 'Mapping des colonnes' })
  @IsOptional()
  @IsObject()
  columnMapping?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Options d\'import', type: ImportOptionsDto })
  @IsOptional()
  @IsObject()
  options?: ImportOptionsDto;

  @ApiPropertyOptional({ description: 'Mode simulation (dry run)', default: false })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}

export class ValidateImportDto {
  @ApiProperty({ description: 'ID du job d\'import à valider' })
  @IsString()
  jobId: string;
}

export class ProcessImportDto {
  @ApiProperty({ description: 'ID du job d\'import à traiter' })
  @IsString()
  jobId: string;

  @ApiPropertyOptional({ description: 'Forcer le traitement même avec erreurs' })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}

export class ImportTemplateDto {
  @ApiProperty({ enum: ImportType, description: 'Type pour lequel générer le template' })
  @IsEnum(ImportType)
  type: ImportType;
}
