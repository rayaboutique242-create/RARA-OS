// src/currencies/dto/create-currency.dto.ts
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsDateString,
  IsEnum,
  Min,
  Max,
  Length,
  IsInt,
} from 'class-validator';

export class CreateCurrencyConfigDto {
  @ApiProperty({ description: 'Code ISO de la devise (3 lettres)', example: 'XOF' })
  @IsString()
  @Length(3, 3)
  currencyCode: string;

  @ApiProperty({ description: 'Nom de la devise', example: 'Franc CFA' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Nom en francais' })
  @IsOptional()
  @IsString()
  nameFr?: string;

  @ApiProperty({ description: 'Symbole', example: 'FCFA' })
  @IsString()
  symbol: string;

  @ApiPropertyOptional({ description: 'Symbole natif' })
  @IsOptional()
  @IsString()
  symbolNative?: string;

  @ApiPropertyOptional({ description: 'Nombre de decimales', default: 2 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(8)
  decimalPlaces?: number;

  @ApiPropertyOptional({ description: 'Separateur decimal', default: '.' })
  @IsOptional()
  @IsString()
  decimalSeparator?: string;

  @ApiPropertyOptional({ description: 'Separateur des milliers', default: ',' })
  @IsOptional()
  @IsString()
  thousandsSeparator?: string;

  @ApiPropertyOptional({ description: 'Position du symbole', enum: ['before', 'after'] })
  @IsOptional()
  @IsString()
  symbolPosition?: string;

  @ApiPropertyOptional({ description: 'Est la devise de base', default: false })
  @IsOptional()
  @IsBoolean()
  isBaseCurrency?: boolean;

  @ApiPropertyOptional({ description: 'Pays' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ description: 'Code pays' })
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiPropertyOptional({ description: 'Ordre d\'affichage' })
  @IsOptional()
  @IsInt()
  displayOrder?: number;
}

export class UpdateCurrencyConfigDto extends PartialType(CreateCurrencyConfigDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDisplayed?: boolean;
}

export class CreateExchangeRateDto {
  @ApiProperty({ description: 'Devise source', example: 'USD' })
  @IsString()
  @Length(3, 3)
  fromCurrency: string;

  @ApiProperty({ description: 'Devise cible', example: 'XOF' })
  @IsString()
  @Length(3, 3)
  toCurrency: string;

  @ApiProperty({ description: 'Taux de change', example: 615.5 })
  @IsNumber()
  @Min(0.00000001)
  rate: number;

  @ApiPropertyOptional({ description: 'Taux d\'achat' })
  @IsOptional()
  @IsNumber()
  buyRate?: number;

  @ApiPropertyOptional({ description: 'Taux de vente' })
  @IsOptional()
  @IsNumber()
  sellRate?: number;

  @ApiPropertyOptional({ description: 'Marge en %', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  spreadPercent?: number;

  @ApiPropertyOptional({ description: 'Source du taux', enum: ['MANUAL', 'API', 'BANK'] })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ description: 'Details de la source' })
  @IsOptional()
  @IsString()
  sourceDetails?: string;

  @ApiPropertyOptional({ description: 'Date d\'effet' })
  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @ApiPropertyOptional({ description: 'Date d\'expiration' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}

export class UpdateExchangeRateDto extends PartialType(CreateExchangeRateDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ConvertAmountDto {
  @ApiProperty({ description: 'Montant a convertir' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ description: 'Devise source', example: 'USD' })
  @IsString()
  @Length(3, 3)
  fromCurrency: string;

  @ApiProperty({ description: 'Devise cible', example: 'XOF' })
  @IsString()
  @Length(3, 3)
  toCurrency: string;

  @ApiPropertyOptional({ description: 'Contexte de la conversion' })
  @IsOptional()
  @IsString()
  context?: string;

  @ApiPropertyOptional({ description: 'Type de reference' })
  @IsOptional()
  @IsString()
  referenceType?: string;

  @ApiPropertyOptional({ description: 'ID de reference' })
  @IsOptional()
  @IsNumber()
  referenceId?: number;
}

export class SetProductPriceDto {
  @ApiProperty({ description: 'ID du produit' })
  @IsInt()
  productId: number;

  @ApiProperty({ description: 'Code devise', example: 'EUR' })
  @IsString()
  @Length(3, 3)
  currencyCode: string;

  @ApiProperty({ description: 'Prix dans cette devise' })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ description: 'Prix original (avant promo)' })
  @IsOptional()
  @IsNumber()
  originalPrice?: number;

  @ApiPropertyOptional({ description: 'Prix de revient' })
  @IsOptional()
  @IsNumber()
  costPrice?: number;

  @ApiPropertyOptional({ description: 'Prix minimum' })
  @IsOptional()
  @IsNumber()
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Prix maximum' })
  @IsOptional()
  @IsNumber()
  maxPrice?: number;
}

export class BulkConvertPricesDto {
  @ApiProperty({ description: 'Devise source' })
  @IsString()
  @Length(3, 3)
  fromCurrency: string;

  @ApiProperty({ description: 'Devise cible' })
  @IsString()
  @Length(3, 3)
  toCurrency: string;

  @ApiPropertyOptional({ description: 'IDs des produits (tous si vide)' })
  @IsOptional()
  @IsInt({ each: true })
  productIds?: number[];

  @ApiPropertyOptional({ description: 'Ecraser les prix existants', default: false })
  @IsOptional()
  @IsBoolean()
  overwriteExisting?: boolean;
}

export class CurrencyQueryDto {
  @ApiPropertyOptional({ description: 'Filtrer par statut actif' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Filtrer par affichage' })
  @IsOptional()
  @IsBoolean()
  isDisplayed?: boolean;
}

export class ExchangeRateQueryDto {
  @ApiPropertyOptional({ description: 'Devise source' })
  @IsOptional()
  @IsString()
  fromCurrency?: string;

  @ApiPropertyOptional({ description: 'Devise cible' })
  @IsOptional()
  @IsString()
  toCurrency?: string;

  @ApiPropertyOptional({ description: 'Source du taux' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ description: 'Filtrer par statut actif' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @IsNumber()
  limit?: number;
}
