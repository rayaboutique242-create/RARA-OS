// src/inventory/dto/create-stock-movement.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsDateString,
  Min,
} from 'class-validator';
import { MovementType, MovementReason } from '../entities/stock-movement.entity';

export class CreateStockMovementDto {
  @ApiProperty({ description: 'ID du produit' })
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ enum: MovementType, description: 'Type de mouvement' })
  @IsEnum(MovementType)
  @IsNotEmpty()
  type: MovementType;

  @ApiProperty({ enum: MovementReason, description: 'Raison du mouvement' })
  @IsEnum(MovementReason)
  @IsNotEmpty()
  reason: MovementReason;

  @ApiProperty({ description: 'Quantité (positive)' })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: 'Coût unitaire' })
  @IsNumber()
  @IsOptional()
  unitCost?: number;

  @ApiPropertyOptional({ description: 'Type de référence (order, purchase, etc.)' })
  @IsString()
  @IsOptional()
  referenceType?: string;

  @ApiPropertyOptional({ description: 'ID de référence' })
  @IsString()
  @IsOptional()
  referenceId?: string;

  @ApiPropertyOptional({ description: 'Numéro de référence' })
  @IsString()
  @IsOptional()
  referenceNumber?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Emplacement source' })
  @IsString()
  @IsOptional()
  locationFrom?: string;

  @ApiPropertyOptional({ description: 'Emplacement destination' })
  @IsString()
  @IsOptional()
  locationTo?: string;

  @ApiPropertyOptional({ description: 'Numéro de lot' })
  @IsString()
  @IsOptional()
  batchNumber?: string;

  @ApiPropertyOptional({ description: 'Date d\'expiration' })
  @IsDateString()
  @IsOptional()
  expiryDate?: string;
}

export class StockAdjustmentDto {
  @ApiProperty({ description: 'ID du produit' })
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'Nouvelle quantité en stock' })
  @IsNumber()
  @Min(0)
  newQuantity: number;

  @ApiProperty({ enum: MovementReason, description: 'Raison de l\'ajustement' })
  @IsEnum(MovementReason)
  @IsNotEmpty()
  reason: MovementReason;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class BulkStockMovementDto {
  @ApiProperty({ type: [CreateStockMovementDto] })
  movements: CreateStockMovementDto[];
}

export class StockMovementQueryDto {
  @ApiPropertyOptional({ description: 'ID du produit' })
  @IsUUID()
  @IsOptional()
  productId?: string;

  @ApiPropertyOptional({ enum: MovementType })
  @IsEnum(MovementType)
  @IsOptional()
  type?: MovementType;

  @ApiPropertyOptional({ enum: MovementReason })
  @IsEnum(MovementReason)
  @IsOptional()
  reason?: MovementReason;

  @ApiPropertyOptional({ description: 'Date de début' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Date de fin' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Type de référence' })
  @IsString()
  @IsOptional()
  referenceType?: string;

  @ApiPropertyOptional({ description: 'ID de référence' })
  @IsString()
  @IsOptional()
  referenceId?: string;

  @ApiPropertyOptional({ description: 'Page' })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Limite' })
  @IsOptional()
  limit?: number;
}
