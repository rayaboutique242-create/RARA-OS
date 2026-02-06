// src/returns/dto/return-policy.dto.ts
import { IsString, IsOptional, IsNumber, IsBoolean, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReturnPolicyDto {
  @ApiProperty({ description: 'Nom de la politique' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Jours pour retour', default: 30 })
  @IsOptional()
  @IsNumber()
  returnWindowDays?: number;

  @ApiPropertyOptional({ description: 'Autoriser remboursement', default: true })
  @IsOptional()
  @IsBoolean()
  allowRefund?: boolean;

  @ApiPropertyOptional({ description: 'Autoriser échange', default: true })
  @IsOptional()
  @IsBoolean()
  allowExchange?: boolean;

  @ApiPropertyOptional({ description: 'Autoriser avoir', default: true })
  @IsOptional()
  @IsBoolean()
  allowStoreCredit?: boolean;

  @ApiPropertyOptional({ description: 'Pourcentage frais restockage', default: 0 })
  @IsOptional()
  @IsNumber()
  restockingFeePercent?: number;

  @ApiPropertyOptional({ description: 'Reçu requis', default: false })
  @IsOptional()
  @IsBoolean()
  requireReceipt?: boolean;

  @ApiPropertyOptional({ description: 'Emballage original requis', default: false })
  @IsOptional()
  @IsBoolean()
  requireOriginalPackaging?: boolean;

  @ApiPropertyOptional({ description: 'État neuf requis', default: true })
  @IsOptional()
  @IsBoolean()
  requireUnusedCondition?: boolean;

  @ApiPropertyOptional({ type: [Number], description: 'Catégories exclues' })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  excludedCategories?: number[];

  @ApiPropertyOptional({ type: [Number], description: 'Produits exclus' })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  excludedProducts?: number[];

  @ApiPropertyOptional({ description: 'Jours validité avoir', default: 365 })
  @IsOptional()
  @IsNumber()
  storeCreditValidityDays?: number;

  @ApiPropertyOptional({ description: 'Politique par défaut', default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: 'ID catégorie associée' })
  @IsOptional()
  @IsNumber()
  categoryId?: number;
}

export class UpdateReturnPolicyDto {
  @ApiPropertyOptional({ description: 'Nom de la politique' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Jours pour retour' })
  @IsOptional()
  @IsNumber()
  returnWindowDays?: number;

  @ApiPropertyOptional({ description: 'Autoriser remboursement' })
  @IsOptional()
  @IsBoolean()
  allowRefund?: boolean;

  @ApiPropertyOptional({ description: 'Autoriser échange' })
  @IsOptional()
  @IsBoolean()
  allowExchange?: boolean;

  @ApiPropertyOptional({ description: 'Autoriser avoir' })
  @IsOptional()
  @IsBoolean()
  allowStoreCredit?: boolean;

  @ApiPropertyOptional({ description: 'Pourcentage frais restockage' })
  @IsOptional()
  @IsNumber()
  restockingFeePercent?: number;

  @ApiPropertyOptional({ description: 'Actif' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Politique par défaut' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
