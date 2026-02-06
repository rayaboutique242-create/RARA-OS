// src/returns/dto/store-credit.dto.ts
import { IsString, IsOptional, IsNumber, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStoreCreditDto {
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

  @ApiProperty({ description: 'Montant de l\'avoir' })
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({ description: 'Devise', default: 'XOF' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'ID de la demande de retour' })
  @IsOptional()
  @IsNumber()
  returnRequestId?: number;

  @ApiPropertyOptional({ description: 'Date d\'expiration' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UseStoreCreditDto {
  @ApiProperty({ description: 'Code de l\'avoir' })
  @IsString()
  creditCode: string;

  @ApiProperty({ description: 'Montant à utiliser' })
  @IsNumber()
  amount: number;

  @ApiProperty({ description: 'ID de la commande' })
  @IsNumber()
  orderId: number;
}

export class StoreCreditQueryDto {
  @ApiPropertyOptional({ description: 'ID du client' })
  @IsOptional()
  @IsNumber()
  customerId?: number;

  @ApiPropertyOptional({ description: 'Statut' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Code de l\'avoir' })
  @IsOptional()
  @IsString()
  creditCode?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumber()
  limit?: number;
}
