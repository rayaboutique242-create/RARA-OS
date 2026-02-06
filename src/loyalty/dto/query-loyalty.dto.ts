// src/loyalty/dto/query-loyalty.dto.ts
import { IsOptional, IsString, IsNumber, IsEnum, IsDateString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PointsTransactionType, PointsSource } from '../entities/loyalty-points.entity';
import { RedemptionStatus } from '../entities/loyalty-redemption.entity';

export class QueryPointsDto {
  @ApiPropertyOptional({ description: 'ID du client' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  customerId?: number;

  @ApiPropertyOptional({ enum: PointsTransactionType })
  @IsOptional()
  @IsEnum(PointsTransactionType)
  transactionType?: PointsTransactionType;

  @ApiPropertyOptional({ enum: PointsSource })
  @IsOptional()
  @IsEnum(PointsSource)
  source?: PointsSource;

  @ApiPropertyOptional({ description: 'Date de début' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Date de fin' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Page', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Limite', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;
}

export class QueryRedemptionsDto {
  @ApiPropertyOptional({ description: 'ID du client' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  customerId?: number;

  @ApiPropertyOptional({ enum: RedemptionStatus })
  @IsOptional()
  @IsEnum(RedemptionStatus)
  status?: RedemptionStatus;

  @ApiPropertyOptional({ description: 'ID de la récompense' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  rewardId?: number;

  @ApiPropertyOptional({ description: 'Date de début' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Date de fin' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Page', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Limite', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;
}

export class QueryRewardsDto {
  @ApiPropertyOptional({ description: 'ID du programme' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  programId?: number;

  @ApiPropertyOptional({ description: 'Recherche par nom' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Type de récompense' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: 'Actif uniquement', default: true })
  @IsOptional()
  activeOnly?: boolean;

  @ApiPropertyOptional({ description: 'Points max du client' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxPoints?: number;

  @ApiPropertyOptional({ description: 'Page', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Limite', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;
}

export class QueryCustomersLoyaltyDto {
  @ApiPropertyOptional({ description: 'Recherche (nom, email)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'ID du niveau' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tierId?: number;

  @ApiPropertyOptional({ description: 'Points minimum' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minPoints?: number;

  @ApiPropertyOptional({ description: 'Points maximum' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxPoints?: number;

  @ApiPropertyOptional({ description: 'Tri par', default: 'currentPoints' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Ordre de tri', default: 'DESC' })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';

  @ApiPropertyOptional({ description: 'Page', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Limite', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;
}
