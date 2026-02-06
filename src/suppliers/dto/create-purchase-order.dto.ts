// src/suppliers/dto/create-purchase-order.dto.ts
import { IsString, IsOptional, IsEnum, IsNumber, IsArray, ValidateNested, IsDateString, Min, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PurchaseOrderStatus, PurchaseOrderPriority } from '../entities/purchase-order.entity';

export class PurchaseOrderItemDto {
  @ApiProperty({ description: 'ID du produit' })
  @IsUUID()
  productId: string;

  @ApiProperty({ description: 'Quantité commandée' })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: 'Coût unitaire' })
  @IsNumber()
  @Min(0)
  unitCost: number;

  @ApiPropertyOptional({ description: 'SKU fournisseur' })
  @IsString()
  @IsOptional()
  supplierSku?: string;

  @ApiPropertyOptional({ description: 'Taux de taxe (%)' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  taxRate?: number;

  @ApiPropertyOptional({ description: 'Remise (%)' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  discountPercent?: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreatePurchaseOrderDto {
  @ApiProperty({ description: 'ID du fournisseur' })
  @IsUUID()
  supplierId: string;

  @ApiPropertyOptional({ enum: PurchaseOrderPriority, default: PurchaseOrderPriority.NORMAL })
  @IsEnum(PurchaseOrderPriority)
  @IsOptional()
  priority?: PurchaseOrderPriority;

  @ApiPropertyOptional({ description: 'Date prévue de livraison' })
  @IsDateString()
  @IsOptional()
  expectedDate?: string;

  @ApiProperty({ description: 'Articles de la commande', type: [PurchaseOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  items: PurchaseOrderItemDto[];

  @ApiPropertyOptional({ description: 'Conditions de paiement' })
  @IsString()
  @IsOptional()
  paymentTerms?: string;

  @ApiPropertyOptional({ description: 'Frais de livraison' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  shippingCost?: number;

  @ApiPropertyOptional({ description: 'Adresse de livraison' })
  @IsString()
  @IsOptional()
  shippingAddress?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Notes internes' })
  @IsString()
  @IsOptional()
  internalNotes?: string;

  @ApiPropertyOptional({ description: 'Numéro de référence externe' })
  @IsString()
  @IsOptional()
  referenceNumber?: string;
}

export class UpdatePurchaseOrderDto {
  @ApiPropertyOptional({ enum: PurchaseOrderPriority })
  @IsEnum(PurchaseOrderPriority)
  @IsOptional()
  priority?: PurchaseOrderPriority;

  @ApiPropertyOptional({ description: 'Date prévue de livraison' })
  @IsDateString()
  @IsOptional()
  expectedDate?: string;

  @ApiPropertyOptional({ description: 'Frais de livraison' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  shippingCost?: number;

  @ApiPropertyOptional({ description: 'Adresse de livraison' })
  @IsString()
  @IsOptional()
  shippingAddress?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Notes internes' })
  @IsString()
  @IsOptional()
  internalNotes?: string;
}

export class PurchaseOrderQueryDto {
  @ApiPropertyOptional({ description: 'ID du fournisseur' })
  @IsUUID()
  @IsOptional()
  supplierId?: string;

  @ApiPropertyOptional({ enum: PurchaseOrderStatus })
  @IsEnum(PurchaseOrderStatus)
  @IsOptional()
  status?: PurchaseOrderStatus;

  @ApiPropertyOptional({ enum: PurchaseOrderPriority })
  @IsEnum(PurchaseOrderPriority)
  @IsOptional()
  priority?: PurchaseOrderPriority;

  @ApiPropertyOptional({ description: 'Date début' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Date fin' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Page', default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Limite', default: 20 })
  @IsOptional()
  limit?: number;
}

export class AddPurchaseOrderItemsDto {
  @ApiProperty({ description: 'Articles à ajouter', type: [PurchaseOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  items: PurchaseOrderItemDto[];
}
