// src/loyalty/dto/create-program.dto.ts
import { IsString, IsOptional, IsNumber, IsEnum, IsDateString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PointsEarnType, ProgramStatus } from '../entities/loyalty-program.entity';

export class CreateProgramDto {
  @ApiProperty({ description: 'Nom du programme', example: 'Club Fidélité Raya' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Description du programme' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: PointsEarnType, default: PointsEarnType.PERCENTAGE })
  @IsOptional()
  @IsEnum(PointsEarnType)
  pointsEarnType?: PointsEarnType;

  @ApiPropertyOptional({ description: 'Points par unité de devise', example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  pointsPerUnit?: number;

  @ApiPropertyOptional({ description: 'Devise par point (ex: 100 FCFA = 1 point)', example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  currencyPerPoint?: number;

  @ApiPropertyOptional({ description: 'Valeur d\'un point en devise', example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  pointValue?: number;

  @ApiPropertyOptional({ description: 'Points bonus de bienvenue', example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  welcomeBonus?: number;

  @ApiPropertyOptional({ description: 'Points bonus anniversaire', example: 50 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  birthdayBonus?: number;

  @ApiPropertyOptional({ description: 'Points bonus parrainage', example: 200 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  referralBonus?: number;

  @ApiPropertyOptional({ description: 'Achat minimum pour gagner des points', example: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumPurchaseForPoints?: number;

  @ApiPropertyOptional({ description: 'Points minimum pour échange', example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumPointsForRedemption?: number;

  @ApiPropertyOptional({ description: 'Jours avant expiration des points (0 = jamais)', example: 365 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  pointsExpirationDays?: number;

  @ApiPropertyOptional({ description: 'Points max par transaction (0 = illimité)', example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxPointsPerTransaction?: number;

  @ApiPropertyOptional({ description: '% max payable en points', example: 50 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  maxRedemptionPercentage?: number;

  @ApiPropertyOptional({ description: 'Multiplicateurs par catégorie (JSON)' })
  @IsOptional()
  @IsString()
  categoryMultipliers?: string;

  @ApiPropertyOptional({ description: 'IDs produits exclus (JSON)' })
  @IsOptional()
  @IsString()
  excludedProductIds?: string;

  @ApiPropertyOptional({ description: 'IDs catégories exclues (JSON)' })
  @IsOptional()
  @IsString()
  excludedCategoryIds?: string;

  @ApiPropertyOptional({ enum: ProgramStatus, default: ProgramStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ProgramStatus)
  status?: ProgramStatus;

  @ApiPropertyOptional({ description: 'Date de début' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Date de fin' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Termes et conditions' })
  @IsOptional()
  @IsString()
  termsAndConditions?: string;
}
