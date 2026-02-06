// src/loyalty/dto/earn-points.dto.ts
import { IsNumber, IsOptional, IsString, IsEnum, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PointsSource } from '../entities/loyalty-points.entity';

export class EarnPointsDto {
  @ApiProperty({ description: 'ID du client', example: 1 })
  @IsNumber()
  customerId: number;

  @ApiProperty({ description: 'Nombre de points', example: 100 })
  @IsNumber()
  @Min(1)
  points: number;

  @ApiProperty({ enum: PointsSource, description: 'Source des points' })
  @IsEnum(PointsSource)
  source: PointsSource;

  @ApiPropertyOptional({ description: 'ID de la commande' })
  @IsOptional()
  @IsNumber()
  orderId?: number;

  @ApiPropertyOptional({ description: 'Numéro de commande' })
  @IsOptional()
  @IsString()
  orderNumber?: string;

  @ApiPropertyOptional({ description: 'Montant de la commande' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  orderAmount?: number;

  @ApiPropertyOptional({ description: 'Multiplicateur appliqué', example: 1.5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  multiplier?: number;

  @ApiPropertyOptional({ description: 'ID de la promotion' })
  @IsOptional()
  @IsNumber()
  promotionId?: number;

  @ApiPropertyOptional({ description: 'Code de la promotion' })
  @IsOptional()
  @IsString()
  promotionCode?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'ID du filleul (pour parrainage)' })
  @IsOptional()
  @IsNumber()
  referredCustomerId?: number;
}

export class AdjustPointsDto {
  @ApiProperty({ description: 'ID du client', example: 1 })
  @IsNumber()
  customerId: number;

  @ApiProperty({ description: 'Points à ajouter (positif) ou retirer (négatif)', example: -50 })
  @IsNumber()
  points: number;

  @ApiProperty({ description: 'Raison de l\'ajustement' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ description: 'Notes additionnelles' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class TransferPointsDto {
  @ApiProperty({ description: 'ID du client source', example: 1 })
  @IsNumber()
  fromCustomerId: number;

  @ApiProperty({ description: 'ID du client destination', example: 2 })
  @IsNumber()
  toCustomerId: number;

  @ApiProperty({ description: 'Points à transférer', example: 100 })
  @IsNumber()
  @Min(1)
  points: number;

  @ApiPropertyOptional({ description: 'Raison du transfert' })
  @IsOptional()
  @IsString()
  reason?: string;
}
