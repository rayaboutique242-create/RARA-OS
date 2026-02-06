// src/loyalty/dto/redeem-reward.dto.ts
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RedeemRewardDto {
  @ApiProperty({ description: 'ID du client', example: 1 })
  @IsNumber()
  customerId: number;

  @ApiProperty({ description: 'ID de la récompense', example: 1 })
  @IsNumber()
  rewardId: number;

  @ApiPropertyOptional({ description: 'Notes du client' })
  @IsOptional()
  @IsString()
  customerNotes?: string;
}

export class UseRedemptionDto {
  @ApiProperty({ description: 'ID de la commande', example: 1 })
  @IsNumber()
  orderId: number;

  @ApiPropertyOptional({ description: 'Numéro de commande' })
  @IsOptional()
  @IsString()
  orderNumber?: string;
}

export class CancelRedemptionDto {
  @ApiProperty({ description: 'Raison de l\'annulation' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ description: 'Rembourser les points', default: true })
  @IsOptional()
  refundPoints?: boolean;
}
