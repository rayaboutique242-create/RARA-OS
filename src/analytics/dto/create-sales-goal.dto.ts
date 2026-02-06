// src/analytics/dto/create-sales-goal.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, IsDateString, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GoalType, GoalPeriod } from '../entities/sales-goal.entity';

export class CreateSalesGoalDto {
  @ApiProperty({ description: 'Nom de l\'objectif' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: GoalType })
  @IsEnum(GoalType)
  goalType: GoalType;

  @ApiProperty({ enum: GoalPeriod })
  @IsEnum(GoalPeriod)
  period: GoalPeriod;

  @ApiProperty({ description: 'Valeur cible' })
  @IsNumber()
  targetValue: number;

  @ApiProperty()
  @IsDateString()
  startDate: string;

  @ApiProperty()
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assigneeType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  assigneeId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assigneeName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  categoryId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  productId?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  notifyOnMilestone?: boolean;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @IsNumber()
  milestonePercentage?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  notifyOnCompletion?: boolean;
}

export class UpdateSalesGoalDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  targetValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assigneeType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  assigneeId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assigneeName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notifyOnMilestone?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  milestonePercentage?: number;
}
