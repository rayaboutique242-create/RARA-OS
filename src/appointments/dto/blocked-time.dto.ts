// src/appointments/dto/blocked-time.dto.ts
import { IsString, IsOptional, IsNumber, IsBoolean, IsEnum, IsDateString, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BlockedTimeType } from '../entities/blocked-time.entity';

export class CreateBlockedTimeDto {
  @ApiProperty({ description: 'Titre du blocage' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: BlockedTimeType, description: 'Type de blocage' })
  @IsOptional()
  @IsEnum(BlockedTimeType)
  type?: BlockedTimeType;

  @ApiProperty({ description: 'Date de début (YYYY-MM-DD)' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'Date de fin (YYYY-MM-DD)' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ description: 'Heure de début (HH:mm)' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
  startTime?: string;

  @ApiPropertyOptional({ description: 'Heure de fin (HH:mm)' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
  endTime?: string;

  @ApiPropertyOptional({ description: 'Journée entière', default: true })
  @IsOptional()
  @IsBoolean()
  isAllDay?: boolean;

  @ApiPropertyOptional({ description: 'Récurrent' })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({ description: 'Pattern de récurrence (DAILY, WEEKLY, MONTHLY, YEARLY)' })
  @IsOptional()
  @IsString()
  recurringPattern?: string;

  @ApiPropertyOptional({ description: 'ID du personnel concerné' })
  @IsOptional()
  @IsNumber()
  staffId?: number;

  @ApiPropertyOptional({ description: 'Nom du personnel concerné' })
  @IsOptional()
  @IsString()
  staffName?: string;

  @ApiPropertyOptional({ description: 'Appliquer à tout le personnel', default: true })
  @IsOptional()
  @IsBoolean()
  appliesToAllStaff?: boolean;
}

export class UpdateBlockedTimeDto {
  @ApiPropertyOptional({ description: 'Titre du blocage' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: BlockedTimeType })
  @IsOptional()
  @IsEnum(BlockedTimeType)
  type?: BlockedTimeType;

  @ApiPropertyOptional({ description: 'Date de début (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Date de fin (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Heure de début (HH:mm)' })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({ description: 'Heure de fin (HH:mm)' })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiPropertyOptional({ description: 'Journée entière' })
  @IsOptional()
  @IsBoolean()
  isAllDay?: boolean;
}

export class BlockedTimeQueryDto {
  @ApiPropertyOptional({ description: 'Date de début' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Date de fin' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ enum: BlockedTimeType })
  @IsOptional()
  @IsEnum(BlockedTimeType)
  type?: BlockedTimeType;

  @ApiPropertyOptional({ description: 'ID du personnel' })
  @IsOptional()
  @IsNumber()
  staffId?: number;
}
