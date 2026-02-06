// src/loyalty/dto/create-reward.dto.ts
import { IsString, IsOptional, IsNumber, IsEnum, IsBoolean, IsDateString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RewardType, RewardStatus } from '../entities/loyalty-reward.entity';

export class CreateRewardDto {
  @ApiProperty({ description: 'Nom de la récompense', example: 'Bon de 5000 FCFA' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'ID du programme', example: 1 })
  @IsNumber()
  programId: number;

  @ApiProperty({ enum: RewardType, description: 'Type de récompense' })
  @IsEnum(RewardType)
  type: RewardType;

  @ApiProperty({ description: 'Valeur (% ou montant)', example: 5000 })
  @IsNumber()
  @Min(0)
  value: number;

  @ApiProperty({ description: 'Coût en points', example: 500 })
  @IsNumber()
  @Min(1)
  pointsCost: number;

  @ApiPropertyOptional({ description: 'ID du produit gratuit (si FREE_PRODUCT)' })
  @IsOptional()
  @IsNumber()
  freeProductId?: number;

  @ApiPropertyOptional({ description: 'Nom du produit gratuit' })
  @IsOptional()
  @IsString()
  freeProductName?: string;

  @ApiPropertyOptional({ description: 'Quantité produit gratuit', example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  freeProductQuantity?: number;

  @ApiPropertyOptional({ description: 'Stock disponible (0 = illimité)', example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stockQuantity?: number;

  @ApiPropertyOptional({ description: 'Max échanges par client (0 = illimité)', example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxRedemptionsPerCustomer?: number;

  @ApiPropertyOptional({ description: 'Max échanges total (0 = illimité)', example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxRedemptionsTotal?: number;

  @ApiPropertyOptional({ description: 'Montant achat minimum', example: 10000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumPurchaseAmount?: number;

  @ApiPropertyOptional({ description: 'Niveau minimum requis' })
  @IsOptional()
  @IsString()
  requiredTierId?: string;

  @ApiPropertyOptional({ description: 'Niveaux éligibles (JSON)' })
  @IsOptional()
  @IsString()
  eligibleTierIds?: string;

  @ApiPropertyOptional({ description: 'Catégories éligibles (JSON)' })
  @IsOptional()
  @IsString()
  eligibleCategoryIds?: string;

  @ApiPropertyOptional({ description: 'Produits éligibles (JSON)' })
  @IsOptional()
  @IsString()
  eligibleProductIds?: string;

  @ApiPropertyOptional({ description: 'Date de début' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Date de fin' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Jours de validité après obtention', example: 30 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  validityDays?: number;

  @ApiPropertyOptional({ description: 'URL de l\'image' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Couleur (#HEX)', example: '#4CAF50' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'Icône', example: 'gift' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: 'Ordre d\'affichage', example: 1 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Mis en avant', example: true })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ description: 'Visible', default: true })
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @ApiPropertyOptional({ enum: RewardStatus, default: RewardStatus.ACTIVE })
  @IsOptional()
  @IsEnum(RewardStatus)
  status?: RewardStatus;

  @ApiPropertyOptional({ description: 'Termes et conditions' })
  @IsOptional()
  @IsString()
  termsAndConditions?: string;
}
