// src/settings/dto/create-currency.dto.ts
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  MaxLength,
  MinLength,
  Min,
  Max,
} from 'class-validator';

export class CreateCurrencyDto {
  @ApiProperty({ description: 'Code ISO 4217', example: 'XOF', minLength: 3, maxLength: 3 })
  @IsString()
  @MinLength(3)
  @MaxLength(3)
  code: string;

  @ApiProperty({ description: 'Nom de la devise', example: 'Franc CFA BCEAO' })
  @IsString()
  @MaxLength(50)
  name: string;

  @ApiProperty({ description: 'Symbole', example: 'FCFA' })
  @IsString()
  @MaxLength(10)
  symbol: string;

  @ApiPropertyOptional({ description: 'Position du symbole', example: 'after', default: 'before' })
  @IsOptional()
  @IsString()
  symbolPosition?: string;

  @ApiPropertyOptional({ description: 'Nombre de décimales', example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(4)
  decimalPlaces?: number;

  @ApiPropertyOptional({ description: 'Séparateur décimal', example: ',' })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  decimalSeparator?: string;

  @ApiPropertyOptional({ description: 'Séparateur des milliers', example: ' ' })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  thousandsSeparator?: string;

  @ApiPropertyOptional({ description: 'Taux de change', example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  exchangeRate?: number;

  @ApiPropertyOptional({ description: 'Devise de base', default: false })
  @IsOptional()
  @IsBoolean()
  isBaseCurrency?: boolean;

  @ApiPropertyOptional({ description: 'Devise active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCurrencyDto extends PartialType(CreateCurrencyDto) {}

export class UpdateExchangeRateDto {
  @ApiProperty({ description: 'Nouveau taux de change', example: 655.957 })
  @IsNumber()
  @Min(0)
  exchangeRate: number;
}

export class ConvertCurrencyDto {
  @ApiProperty({ description: 'Montant à convertir', example: 10000 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ description: 'Devise source', example: 'XOF' })
  @IsString()
  @MinLength(3)
  @MaxLength(3)
  fromCurrency: string;

  @ApiProperty({ description: 'Devise cible', example: 'EUR' })
  @IsString()
  @MinLength(3)
  @MaxLength(3)
  toCurrency: string;
}
