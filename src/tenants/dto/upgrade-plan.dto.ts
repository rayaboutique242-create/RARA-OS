// src/tenants/dto/upgrade-plan.dto.ts
import { IsString, IsEnum, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriptionPlan } from '../entities/tenant.entity';

export class UpgradePlanDto {
  @ApiProperty({ enum: SubscriptionPlan, description: 'Nouveau plan', example: 'PROFESSIONAL' })
  @IsEnum(SubscriptionPlan)
  plan: SubscriptionPlan;

  @ApiPropertyOptional({ description: 'Cycle de facturation', example: 'MONTHLY' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  billingCycle?: string;

  @ApiPropertyOptional({ description: 'Methode de paiement', example: 'MOBILE_MONEY' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'Code promo' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  promoCode?: string;
}
