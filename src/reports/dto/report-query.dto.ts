// src/reports/dto/report-query.dto.ts
import { IsOptional, IsString, IsEnum, IsDateString, IsNumber, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum ReportPeriod {
  TODAY = 'TODAY',
  YESTERDAY = 'YESTERDAY',
  THIS_WEEK = 'THIS_WEEK',
  LAST_WEEK = 'LAST_WEEK',
  THIS_MONTH = 'THIS_MONTH',
  LAST_MONTH = 'LAST_MONTH',
  THIS_QUARTER = 'THIS_QUARTER',
  LAST_QUARTER = 'LAST_QUARTER',
  THIS_YEAR = 'THIS_YEAR',
  LAST_YEAR = 'LAST_YEAR',
  CUSTOM = 'CUSTOM',
}

export enum ReportFormat {
  JSON = 'JSON',
  PDF = 'PDF',
  EXCEL = 'EXCEL',
  CSV = 'CSV',
}

export enum ReportType {
  SALES = 'SALES',
  PRODUCTS = 'PRODUCTS',
  INVENTORY = 'INVENTORY',
  CUSTOMERS = 'CUSTOMERS',
  DELIVERIES = 'DELIVERIES',
  FINANCIAL = 'FINANCIAL',
}

export class ReportQueryDto {
  @ApiPropertyOptional({ enum: ReportPeriod, default: ReportPeriod.THIS_MONTH })
  @IsOptional()
  @IsEnum(ReportPeriod)
  period?: ReportPeriod;

  @ApiPropertyOptional({ description: 'Date de début (pour période personnalisée)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Date de fin (pour période personnalisée)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ enum: ReportFormat, default: ReportFormat.JSON })
  @IsOptional()
  @IsEnum(ReportFormat)
  format?: ReportFormat;

  @ApiPropertyOptional({ description: 'Grouper par: day, week, month' })
  @IsOptional()
  @IsString()
  groupBy?: 'day' | 'week' | 'month';

  @ApiPropertyOptional({ description: 'Filtrer par catégorie' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Filtrer par produit' })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional({ description: 'Filtrer par client' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Filtrer par livreur' })
  @IsOptional()
  @IsString()
  deliveryPersonId?: string;

  @ApiPropertyOptional({ description: 'Limite de résultats', default: 100 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;
}

export class DashboardQueryDto {
  @ApiPropertyOptional({ enum: ReportPeriod, default: ReportPeriod.THIS_MONTH })
  @IsOptional()
  @IsEnum(ReportPeriod)
  period?: ReportPeriod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
