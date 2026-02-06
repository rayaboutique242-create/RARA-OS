// src/settings/dto/create-tax-rate.dto.ts
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsArray,
  IsDateString,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { TaxType, TaxScope } from '../entities/tax-rate.entity';

export class CreateTaxRateDto {
  @ApiProperty({ description: 'Code unique de la taxe', example: 'TVA-18' })
  @IsString()
  @MaxLength(50)
  code: string;

  @ApiProperty({ description: 'Nom de la taxe', example: 'TVA Standard 18%' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: 'Description de la taxe' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: TaxType, default: TaxType.VAT })
  @IsOptional()
  @IsEnum(TaxType)
  type?: TaxType;

  @ApiProperty({ description: 'Taux en pourcentage', example: 18 })
  @IsNumber()
  @Min(0)
  @Max(100)
  rate: number;

  @ApiPropertyOptional({ enum: TaxScope, default: TaxScope.ALL_PRODUCTS })
  @IsOptional()
  @IsEnum(TaxScope)
  scope?: TaxScope;

  @ApiPropertyOptional({ description: 'IDs des catégories concernées', type: [Number] })
  @IsOptional()
  @IsArray()
  categoryIds?: number[];

  @ApiPropertyOptional({ description: 'IDs des produits concernés', type: [String] })
  @IsOptional()
  @IsArray()
  productIds?: string[];

  @ApiPropertyOptional({ description: 'Taxe composée', default: true })
  @IsOptional()
  @IsBoolean()
  isCompound?: boolean;

  @ApiPropertyOptional({ description: 'Incluse dans le prix', default: true })
  @IsOptional()
  @IsBoolean()
  isIncludedInPrice?: boolean;

  @ApiPropertyOptional({ description: 'Taxe par défaut', default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: 'Taxe active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Priorité d\'application' })
  @IsOptional()
  @IsNumber()
  priority?: number;

  @ApiPropertyOptional({ description: 'Pays', example: 'Côte d\'Ivoire' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({ description: 'Région' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  region?: string;

  @ApiPropertyOptional({ description: 'Date d\'effet' })
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiPropertyOptional({ description: 'Date de fin' })
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
}

export class UpdateTaxRateDto extends PartialType(CreateTaxRateDto) {}

export class CalculateTaxDto {
  @ApiProperty({ description: 'Montant HT', example: 10000 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ description: 'ID de la taxe à appliquer' })
  @IsOptional()
  @IsNumber()
  taxRateId?: number;

  @ApiPropertyOptional({ description: 'ID du produit' })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional({ description: 'ID de la catégorie' })
  @IsOptional()
  @IsNumber()
  categoryId?: number;
}

export class TaxQueryDto {
  @ApiPropertyOptional({ enum: TaxType })
  @IsOptional()
  @IsEnum(TaxType)
  type?: TaxType;

  @ApiPropertyOptional({ description: 'Actif uniquement' })
  @IsOptional()
  @IsBoolean()
  activeOnly?: boolean;

  @ApiPropertyOptional({ description: 'Pays' })
  @IsOptional()
  @IsString()
  country?: string;
}
