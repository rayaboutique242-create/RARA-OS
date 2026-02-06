// src/analytics/dto/analytics-query.dto.ts
import { IsOptional, IsString, IsDateString, IsEnum, IsNumber, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum DateRangePreset {
  TODAY = 'TODAY',
  YESTERDAY = 'YESTERDAY',
  LAST_7_DAYS = 'LAST_7_DAYS',
  LAST_30_DAYS = 'LAST_30_DAYS',
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

export enum GroupBy {
  HOUR = 'HOUR',
  DAY = 'DAY',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
  QUARTER = 'QUARTER',
  YEAR = 'YEAR',
  PRODUCT = 'PRODUCT',
  CATEGORY = 'CATEGORY',
  CUSTOMER = 'CUSTOMER',
  PAYMENT_METHOD = 'PAYMENT_METHOD',
  STATUS = 'STATUS',
}

export class AnalyticsQueryDto {
  @ApiPropertyOptional({ enum: DateRangePreset })
  @IsOptional()
  @IsEnum(DateRangePreset)
  dateRange?: DateRangePreset;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ enum: GroupBy })
  @IsOptional()
  @IsEnum(GroupBy)
  groupBy?: GroupBy;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  comparePrevious?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  categoryId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  productId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  customerId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  userId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  storeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}

export class TopPerformersQueryDto {
  @ApiPropertyOptional({ enum: DateRangePreset })
  @IsOptional()
  @IsEnum(DateRangePreset)
  dateRange?: DateRangePreset;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({ description: 'Sort by: revenue, quantity, orders' })
  @IsOptional()
  @IsString()
  sortBy?: string;
}

export class TrendQueryDto {
  @ApiPropertyOptional({ enum: DateRangePreset })
  @IsOptional()
  @IsEnum(DateRangePreset)
  dateRange?: DateRangePreset;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ enum: GroupBy })
  @IsOptional()
  @IsEnum(GroupBy)
  groupBy?: GroupBy;

  @ApiPropertyOptional({ description: 'Metrics to include: revenue,orders,customers,profit' })
  @IsOptional()
  @IsString()
  metrics?: string;
}

export class ComparisonQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  period1Start?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  period1End?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  period2Start?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  period2End?: string;

  @ApiPropertyOptional({ description: 'yoy (Year over Year), mom (Month over Month), wow (Week over Week)' })
  @IsOptional()
  @IsString()
  comparisonType?: string;
}
