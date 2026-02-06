// src/loyalty/dto/create-tier.dto.ts
import { IsString, IsOptional, IsNumber, IsBoolean, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTierDto {
  @ApiProperty({ description: 'Nom du niveau', example: 'Gold' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Description du niveau' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'ID du programme', example: 1 })
  @IsNumber()
  programId: number;

  @ApiPropertyOptional({ description: 'Points minimum pour atteindre ce niveau', example: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumPoints?: number;

  @ApiPropertyOptional({ description: 'Dépenses minimum', example: 100000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumSpend?: number;

  @ApiPropertyOptional({ description: 'Commandes minimum', example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumOrders?: number;

  @ApiPropertyOptional({ description: 'Multiplicateur de points', example: 1.5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  pointsMultiplier?: number;

  @ApiPropertyOptional({ description: 'Réduction permanente (%)', example: 5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercentage?: number;

  @ApiPropertyOptional({ description: 'Livraison gratuite', example: true })
  @IsOptional()
  @IsBoolean()
  freeShipping?: boolean;

  @ApiPropertyOptional({ description: 'Support prioritaire', example: true })
  @IsOptional()
  @IsBoolean()
  prioritySupport?: boolean;

  @ApiPropertyOptional({ description: 'Accès anticipé aux ventes', example: true })
  @IsOptional()
  @IsBoolean()
  earlyAccess?: boolean;

  @ApiPropertyOptional({ description: 'Offres exclusives', example: true })
  @IsOptional()
  @IsBoolean()
  exclusiveOffers?: boolean;

  @ApiPropertyOptional({ description: 'Points bonus anniversaire', example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  birthdayBonusPoints?: number;

  @ApiPropertyOptional({ description: 'Avantages personnalisés (JSON)' })
  @IsOptional()
  @IsString()
  customBenefits?: string;

  @ApiPropertyOptional({ description: 'Couleur (#HEX)', example: '#FFD700' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'URL du badge' })
  @IsOptional()
  @IsString()
  badgeUrl?: string;

  @ApiPropertyOptional({ description: 'Nom de l\'icône', example: 'crown' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: 'Ordre d\'affichage', example: 3 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Mois de rétention', example: 12 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  retentionPeriodMonths?: number;

  @ApiPropertyOptional({ description: 'Points pour maintenir le niveau', example: 500 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  pointsToMaintain?: number;

  @ApiPropertyOptional({ description: 'Actif', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
