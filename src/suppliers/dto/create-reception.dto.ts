// src/suppliers/dto/create-reception.dto.ts
import { IsString, IsOptional, IsNumber, IsArray, ValidateNested, IsDateString, Min, IsUUID, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReceptionItemDto {
  @ApiProperty({ description: 'ID de l\'article de commande' })
  @IsUUID()
  purchaseOrderItemId: string;

  @ApiProperty({ description: 'Quantité reçue' })
  @IsNumber()
  @Min(0)
  receivedQuantity: number;

  @ApiPropertyOptional({ description: 'Quantité acceptée' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  acceptedQuantity?: number;

  @ApiPropertyOptional({ description: 'Quantité rejetée' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  rejectedQuantity?: number;

  @ApiPropertyOptional({ description: 'Numéro de lot' })
  @IsString()
  @IsOptional()
  batchNumber?: string;

  @ApiPropertyOptional({ description: 'Date d\'expiration' })
  @IsDateString()
  @IsOptional()
  expiryDate?: string;

  @ApiPropertyOptional({ description: 'Emplacement de stockage' })
  @IsString()
  @IsOptional()
  storageLocation?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Raison du rejet' })
  @IsString()
  @IsOptional()
  rejectionReason?: string;

  @ApiPropertyOptional({ description: 'Contrôle qualité effectué' })
  @IsBoolean()
  @IsOptional()
  qualityCheck?: boolean;

  @ApiPropertyOptional({ description: 'Notes qualité' })
  @IsString()
  @IsOptional()
  qualityNotes?: string;
}

export class CreateReceptionDto {
  @ApiProperty({ description: 'ID de la commande d\'achat' })
  @IsUUID()
  purchaseOrderId: string;

  @ApiPropertyOptional({ description: 'Numéro du bon de livraison' })
  @IsString()
  @IsOptional()
  deliveryNoteNumber?: string;

  @ApiPropertyOptional({ description: 'Numéro de facture' })
  @IsString()
  @IsOptional()
  invoiceNumber?: string;

  @ApiProperty({ description: 'Articles reçus', type: [ReceptionItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceptionItemDto)
  items: ReceptionItemDto[];

  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class ValidateReceptionDto {
  @ApiPropertyOptional({ description: 'Raison du rejet (si rejet)' })
  @IsString()
  @IsOptional()
  rejectionReason?: string;

  @ApiPropertyOptional({ description: 'Notes d\'inspection' })
  @IsString()
  @IsOptional()
  inspectionNotes?: string;
}

export class ReceptionQueryDto {
  @ApiPropertyOptional({ description: 'ID de la commande' })
  @IsUUID()
  @IsOptional()
  purchaseOrderId?: string;

  @ApiPropertyOptional({ description: 'ID du fournisseur' })
  @IsUUID()
  @IsOptional()
  supplierId?: string;

  @ApiPropertyOptional({ description: 'Statut' })
  @IsString()
  @IsOptional()
  status?: string;

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
