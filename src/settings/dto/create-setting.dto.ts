// src/settings/dto/create-setting.dto.ts
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  MaxLength,
  IsObject,
} from 'class-validator';
import { SettingType, SettingCategory } from '../entities/setting.entity';

export class CreateSettingDto {
  @ApiProperty({ description: 'Clé unique du paramètre', example: 'store_name' })
  @IsString()
  @MaxLength(100)
  key: string;

  @ApiProperty({ description: 'Valeur du paramètre', example: 'Ma Boutique' })
  @IsString()
  value: string;

  @ApiPropertyOptional({ enum: SettingType, default: SettingType.STRING })
  @IsOptional()
  @IsEnum(SettingType)
  type?: SettingType;

  @ApiPropertyOptional({ enum: SettingCategory, default: SettingCategory.GENERAL })
  @IsOptional()
  @IsEnum(SettingCategory)
  category?: SettingCategory;

  @ApiPropertyOptional({ description: 'Libellé du paramètre', example: 'Nom de la boutique' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;

  @ApiPropertyOptional({ description: 'Description du paramètre' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Valeur par défaut' })
  @IsOptional()
  @IsString()
  defaultValue?: string;

  @ApiPropertyOptional({ description: 'Paramètre système non modifiable' })
  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;

  @ApiPropertyOptional({ description: 'Valeur chiffrée' })
  @IsOptional()
  @IsBoolean()
  isEncrypted?: boolean;

  @ApiPropertyOptional({ description: 'Règles de validation (JSON)' })
  @IsOptional()
  @IsString()
  validationRules?: string;

  @ApiPropertyOptional({ description: 'Ordre de tri' })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class UpdateSettingDto extends PartialType(CreateSettingDto) {}

export class BulkUpdateSettingsDto {
  @ApiPropertyOptional({ description: 'Paramètres à mettre à jour' })
  @IsObject()
  settings: Record<string, string>;
}

export class SettingQueryDto {
  @ApiPropertyOptional({ enum: SettingCategory })
  @IsOptional()
  @IsEnum(SettingCategory)
  category?: SettingCategory;

  @ApiPropertyOptional({ description: 'Recherche par clé ou label' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Inclure les paramètres système' })
  @IsOptional()
  @IsBoolean()
  includeSystem?: boolean;
}
