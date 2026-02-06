// src/returns/dto/create-return.dto.ts
import { IsString, IsOptional, IsEnum, IsArray, IsNumber, ValidateNested, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ReturnType, ReturnReason } from '../entities/return-request.entity';

export class ReturnItemDto {
  @ApiProperty({ description: 'ID du produit' })
  @IsNumber()
  productId: number;

  @ApiProperty({ description: 'SKU du produit' })
  @IsString()
  productSku: string;

  @ApiProperty({ description: 'Nom du produit' })
  @IsString()
  productName: string;

  @ApiPropertyOptional({ description: 'Variante du produit' })
  @IsOptional()
  @IsString()
  productVariant?: string;

  @ApiProperty({ description: 'Quantité commandée' })
  @IsNumber()
  quantityOrdered: number;

  @ApiProperty({ description: 'Quantité à retourner' })
  @IsNumber()
  quantityReturned: number;

  @ApiProperty({ description: 'Prix unitaire' })
  @IsNumber()
  unitPrice: number;

  @ApiPropertyOptional({ description: 'Raison du retour pour cet article' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CreateReturnDto {
  @ApiProperty({ description: 'ID de la commande' })
  @IsNumber()
  orderId: number;

  @ApiProperty({ description: 'Numéro de commande' })
  @IsString()
  orderNumber: string;

  @ApiProperty({ description: 'ID du client' })
  @IsNumber()
  customerId: number;

  @ApiProperty({ description: 'Nom du client' })
  @IsString()
  customerName: string;

  @ApiPropertyOptional({ description: 'Email du client' })
  @IsOptional()
  @IsString()
  customerEmail?: string;

  @ApiPropertyOptional({ description: 'Téléphone du client' })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiProperty({ enum: ReturnType, description: 'Type de retour' })
  @IsEnum(ReturnType)
  type: ReturnType;

  @ApiProperty({ enum: ReturnReason, description: 'Raison du retour' })
  @IsEnum(ReturnReason)
  reason: ReturnReason;

  @ApiPropertyOptional({ description: 'Détails de la raison' })
  @IsOptional()
  @IsString()
  reasonDetails?: string;

  @ApiPropertyOptional({ description: 'Notes du client' })
  @IsOptional()
  @IsString()
  customerNotes?: string;

  @ApiProperty({ type: [ReturnItemDto], description: 'Articles à retourner' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  items: ReturnItemDto[];

  @ApiPropertyOptional({ type: [String], description: 'Photos du retour' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];
}

export class UpdateReturnStatusDto {
  @ApiProperty({ description: 'Nouveau statut' })
  @IsString()
  status: string;

  @ApiPropertyOptional({ description: 'Notes administrateur' })
  @IsOptional()
  @IsString()
  adminNotes?: string;

  @ApiPropertyOptional({ description: 'Frais de restockage' })
  @IsOptional()
  @IsNumber()
  restockingFee?: number;

  @ApiPropertyOptional({ description: 'Montant remboursement livraison' })
  @IsOptional()
  @IsNumber()
  shippingRefund?: number;
}

export class ProcessRefundDto {
  @ApiProperty({ description: 'Méthode de remboursement' })
  @IsString()
  refundMethod: string;

  @ApiPropertyOptional({ description: 'ID de transaction' })
  @IsOptional()
  @IsString()
  transactionId?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class InspectItemDto {
  @ApiProperty({ description: 'Quantité reçue' })
  @IsNumber()
  quantityReceived: number;

  @ApiProperty({ description: 'Quantité acceptée' })
  @IsNumber()
  quantityAccepted: number;

  @ApiProperty({ description: 'Quantité rejetée' })
  @IsNumber()
  quantityRejected: number;

  @ApiProperty({ description: 'État du produit' })
  @IsString()
  condition: string;

  @ApiProperty({ description: 'Décision' })
  @IsString()
  decision: string;

  @ApiPropertyOptional({ description: 'Notes d\'inspection' })
  @IsOptional()
  @IsString()
  inspectionNotes?: string;
}

export class ReturnQueryDto {
  @ApiPropertyOptional({ description: 'Statut' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Type' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: 'ID client' })
  @IsOptional()
  @IsNumber()
  customerId?: number;

  @ApiPropertyOptional({ description: 'Numéro de commande' })
  @IsOptional()
  @IsString()
  orderNumber?: string;

  @ApiPropertyOptional({ description: 'Date de début' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Date de fin' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumber()
  limit?: number;
}
