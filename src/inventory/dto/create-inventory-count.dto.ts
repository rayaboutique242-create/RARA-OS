// src/inventory/dto/create-inventory-count.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsArray,
  Min,
} from 'class-validator';
import { InventoryCountType, InventoryCountStatus } from '../entities/inventory-count.entity';

export class CreateInventoryCountDto {
  @ApiProperty({ description: 'Nom de l\'inventaire' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: InventoryCountType, default: InventoryCountType.FULL })
  @IsEnum(InventoryCountType)
  @IsOptional()
  type?: InventoryCountType;

  @ApiPropertyOptional({ description: 'Emplacement' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ description: 'ID de la catégorie (pour inventaire partiel)' })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'IDs des produits (pour inventaire partiel)' })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  productIds?: string[];
}

export class UpdateInventoryCountDto {
  @ApiPropertyOptional({ description: 'Nom de l\'inventaire' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: InventoryCountStatus })
  @IsEnum(InventoryCountStatus)
  @IsOptional()
  status?: InventoryCountStatus;

  @ApiPropertyOptional({ description: 'Emplacement' })
  @IsString()
  @IsOptional()
  location?: string;
}

export class CountItemDto {
  @ApiProperty({ description: 'ID de l\'item d\'inventaire' })
  @IsUUID()
  @IsNotEmpty()
  itemId: string;

  @ApiProperty({ description: 'Quantité comptée' })
  @IsNumber()
  @Min(0)
  countedQuantity: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class BulkCountItemsDto {
  @ApiProperty({ type: [CountItemDto] })
  @IsArray()
  items: CountItemDto[];
}

export class InventoryCountQueryDto {
  @ApiPropertyOptional({ enum: InventoryCountStatus })
  @IsEnum(InventoryCountStatus)
  @IsOptional()
  status?: InventoryCountStatus;

  @ApiPropertyOptional({ enum: InventoryCountType })
  @IsEnum(InventoryCountType)
  @IsOptional()
  type?: InventoryCountType;

  @ApiPropertyOptional({ description: 'Page' })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Limite' })
  @IsOptional()
  limit?: number;
}
