// src/notifications/dto/stock-alert.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsInt, Min } from 'class-validator';
import { StockAlertType, StockAlertStatus } from '../entities/stock-alert.entity';

export class CreateStockAlertDto {
  @ApiProperty({ description: 'ID du produit' })
  @IsString()
  productId: string;

  @ApiProperty({ description: 'Nom du produit' })
  @IsString()
  productName: string;

  @ApiProperty({ description: 'SKU du produit' })
  @IsString()
  productSku: string;

  @ApiProperty({ enum: StockAlertType })
  @IsEnum(StockAlertType)
  alertType: StockAlertType;

  @ApiProperty({ description: 'Stock actuel' })
  @IsInt()
  @Min(0)
  currentStock: number;

  @ApiProperty({ description: 'Seuil d\'alerte' })
  @IsInt()
  @Min(0)
  thresholdLevel: number;
}

export class UpdateStockAlertDto {
  @ApiPropertyOptional({ enum: StockAlertStatus })
  @IsEnum(StockAlertStatus)
  @IsOptional()
  status?: StockAlertStatus;

  @ApiPropertyOptional({ description: 'ID utilisateur qui acquitte' })
  @IsString()
  @IsOptional()
  acknowledgedBy?: string;
}

export class StockAlertQueryDto {
  @ApiPropertyOptional({ enum: StockAlertType })
  @IsEnum(StockAlertType)
  @IsOptional()
  alertType?: StockAlertType;

  @ApiPropertyOptional({ enum: StockAlertStatus })
  @IsEnum(StockAlertStatus)
  @IsOptional()
  status?: StockAlertStatus;

  @ApiPropertyOptional({ description: 'Produit ID' })
  @IsString()
  @IsOptional()
  productId?: string;
}
