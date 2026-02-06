// src/customers/dto/query-customer.dto.ts
import { IsOptional, IsString, IsEnum, IsNumber, IsBoolean, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CustomerStatus, CustomerType, LoyaltyTier } from '../entities/customer.entity';

export class QueryCustomerDto {
  @ApiPropertyOptional({ description: 'Recherche par nom, email, téléphone, code' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: CustomerStatus })
  @IsOptional()
  @IsEnum(CustomerStatus)
  status?: CustomerStatus;

  @ApiPropertyOptional({ enum: CustomerType })
  @IsOptional()
  @IsEnum(CustomerType)
  customerType?: CustomerType;

  @ApiPropertyOptional({ enum: LoyaltyTier })
  @IsOptional()
  @IsEnum(LoyaltyTier)
  loyaltyTier?: LoyaltyTier;

  @ApiPropertyOptional({ description: 'Filtrer par ville' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Filtrer par tag' })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({ description: 'Accepte le marketing' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  acceptsMarketing?: boolean;

  @ApiPropertyOptional({ description: 'Montant minimum dépensé' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  minSpent?: number;

  @ApiPropertyOptional({ description: 'Montant maximum dépensé' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  maxSpent?: number;

  @ApiPropertyOptional({ description: 'Nombre minimum de commandes' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  minOrders?: number;

  @ApiPropertyOptional({ description: 'Clients sans commande depuis X jours' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  inactiveDays?: number;

  @ApiPropertyOptional({ description: 'Tri par champ', example: 'totalSpent' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  limit?: number;
}
