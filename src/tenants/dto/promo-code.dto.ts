// src/tenants/dto/promo-code.dto.ts
import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsBoolean,
  IsDateString,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriptionPlan, PromoDuration, PromoCodeStatus } from '../entities/promo-code.entity';

export class CreatePromoCodeDto {
  @ApiProperty({ description: 'Code unique (ex: LAUNCH2026, PARTNER50)', example: 'PREMIUM2026' })
  @IsString()
  @MinLength(4)
  @MaxLength(50)
  code: string;

  @ApiProperty({ description: 'Nom du code promo', example: 'Offre de lancement' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ 
    description: 'Plan accordé', 
    enum: SubscriptionPlan, 
    example: SubscriptionPlan.PROFESSIONAL 
  })
  @IsEnum(SubscriptionPlan)
  plan: SubscriptionPlan;

  @ApiProperty({ 
    description: 'Durée de l\'abonnement', 
    enum: PromoDuration, 
    example: PromoDuration.THREE_MONTHS 
  })
  @IsEnum(PromoDuration)
  duration: PromoDuration;

  @ApiPropertyOptional({ description: 'Nombre maximum d\'utilisations (null = illimité)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxRedemptions?: number;

  @ApiPropertyOptional({ description: 'Date d\'expiration du code' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  // Overrides des limites du plan
  @ApiPropertyOptional({ description: 'Nombre max d\'utilisateurs' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxUsers?: number;

  @ApiPropertyOptional({ description: 'Nombre max de produits' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxProducts?: number;

  @ApiPropertyOptional({ description: 'Nombre max de magasins' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxStores?: number;

  @ApiPropertyOptional({ description: 'Nombre max de commandes par mois' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxOrdersPerMonth?: number;

  @ApiPropertyOptional({ description: 'Quota de stockage en GB' })
  @IsOptional()
  @IsInt()
  @Min(1)
  storageQuotaGB?: number;

  // Features
  @ApiPropertyOptional({ description: 'Activer la gestion de stock' })
  @IsOptional()
  @IsBoolean()
  featureInventory?: boolean;

  @ApiPropertyOptional({ description: 'Activer les commandes' })
  @IsOptional()
  @IsBoolean()
  featureOrders?: boolean;

  @ApiPropertyOptional({ description: 'Activer les livraisons' })
  @IsOptional()
  @IsBoolean()
  featureDelivery?: boolean;

  @ApiPropertyOptional({ description: 'Activer la fidélité' })
  @IsOptional()
  @IsBoolean()
  featureLoyalty?: boolean;

  @ApiPropertyOptional({ description: 'Activer les analytics' })
  @IsOptional()
  @IsBoolean()
  featureAnalytics?: boolean;

  @ApiPropertyOptional({ description: 'Activer l\'API' })
  @IsOptional()
  @IsBoolean()
  featureApi?: boolean;

  @ApiPropertyOptional({ description: 'Activer le multi-magasin' })
  @IsOptional()
  @IsBoolean()
  featureMultiStore?: boolean;

  @ApiPropertyOptional({ description: 'Notes internes (admin only)' })
  @IsOptional()
  @IsString()
  internalNotes?: string;
}

export class UpdatePromoCodeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: PromoCodeStatus })
  @IsOptional()
  @IsEnum(PromoCodeStatus)
  status?: PromoCodeStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  maxRedemptions?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  internalNotes?: string;
}

export class RedeemPromoCodeDto {
  @ApiProperty({ description: 'Code promo à utiliser', example: 'PREMIUM2026' })
  @IsString()
  @MinLength(4)
  @MaxLength(50)
  code: string;
}

export class PromoCodeQueryDto {
  @ApiPropertyOptional({ enum: PromoCodeStatus })
  @IsOptional()
  @IsEnum(PromoCodeStatus)
  status?: PromoCodeStatus;

  @ApiPropertyOptional({ enum: SubscriptionPlan })
  @IsOptional()
  @IsEnum(SubscriptionPlan)
  plan?: SubscriptionPlan;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class GeneratePromoCodesDto {
  @ApiProperty({ description: 'Préfixe des codes', example: 'LAUNCH' })
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  prefix: string;

  @ApiProperty({ description: 'Nombre de codes à générer', example: 10 })
  @IsInt()
  @Min(1)
  @Max(1000)
  count: number;

  @ApiProperty({ enum: SubscriptionPlan })
  @IsEnum(SubscriptionPlan)
  plan: SubscriptionPlan;

  @ApiProperty({ enum: PromoDuration })
  @IsEnum(PromoDuration)
  duration: PromoDuration;

  @ApiPropertyOptional({ description: 'Chaque code utilisable une seule fois', default: true })
  @IsOptional()
  @IsBoolean()
  singleUse?: boolean = true;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
