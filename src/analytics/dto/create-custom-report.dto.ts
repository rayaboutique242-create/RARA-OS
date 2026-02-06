// src/analytics/dto/create-custom-report.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsEnum, IsObject, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportType, ReportFormat, ReportSchedule } from '../entities/custom-report.entity';

export class ReportConfigDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  metrics?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  dimensions?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dateRange?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sortOrder?: string;
}

export class CreateCustomReportDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ReportType })
  @IsEnum(ReportType)
  reportType: ReportType;

  @ApiPropertyOptional({ enum: ReportFormat })
  @IsOptional()
  @IsEnum(ReportFormat)
  defaultFormat?: ReportFormat;

  @ApiProperty({ type: ReportConfigDto })
  @IsObject()
  config: ReportConfigDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultDateRange?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  comparePreviousPeriod?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  visualizationConfig?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ enum: ReportSchedule })
  @IsOptional()
  @IsEnum(ReportSchedule)
  schedule?: ReportSchedule;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  scheduleRecipients?: string[];
}

export class UpdateCustomReportDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ReportFormat })
  @IsOptional()
  @IsEnum(ReportFormat)
  defaultFormat?: ReportFormat;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  config?: ReportConfigDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultDateRange?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  comparePreviousPeriod?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  visualizationConfig?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isFavorite?: boolean;

  @ApiPropertyOptional({ enum: ReportSchedule })
  @IsOptional()
  @IsEnum(ReportSchedule)
  schedule?: ReportSchedule;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  scheduleRecipients?: string[];
}
