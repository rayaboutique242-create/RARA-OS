// src/customers/dto/loyalty.dto.ts
import { IsNumber, IsString, IsOptional, IsEnum, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LoyaltyTier } from '../entities/customer.entity';

export class AddLoyaltyPointsDto {
  @ApiProperty({ example: 100, description: 'Nombre de points à ajouter' })
  @IsNumber()
  @Min(1)
  points: number;

  @ApiPropertyOptional({ example: 'Achat commande CMD-001', description: 'Raison' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ example: 'order-uuid', description: 'ID commande liée' })
  @IsOptional()
  @IsString()
  orderId?: string;
}

export class RedeemPointsDto {
  @ApiProperty({ example: 500, description: 'Nombre de points à utiliser' })
  @IsNumber()
  @Min(1)
  points: number;

  @ApiPropertyOptional({ example: 'Réduction sur commande', description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateLoyaltyTierDto {
  @ApiProperty({ enum: LoyaltyTier, description: 'Nouveau niveau de fidélité' })
  @IsEnum(LoyaltyTier)
  tier: LoyaltyTier;

  @ApiPropertyOptional({ example: 'Promotion anniversaire' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class LoyaltyTransactionDto {
  customerId: string;
  type: 'EARN' | 'REDEEM' | 'ADJUST' | 'EXPIRE';
  points: number;
  balance: number;
  reason?: string;
  orderId?: string;
  createdAt: Date;
}
