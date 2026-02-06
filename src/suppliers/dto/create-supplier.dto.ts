// src/suppliers/dto/create-supplier.dto.ts
import { IsString, IsOptional, IsEmail, IsEnum, IsNumber, IsArray, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SupplierStatus, PaymentTerms } from '../entities/supplier.entity';

export class CreateSupplierDto {
  @ApiProperty({ description: 'Nom du fournisseur' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Nom du contact' })
  @IsString()
  @IsOptional()
  contactName?: string;

  @ApiPropertyOptional({ description: 'Email' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Téléphone' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'Téléphone secondaire' })
  @IsString()
  @IsOptional()
  secondaryPhone?: string;

  @ApiPropertyOptional({ description: 'Fax' })
  @IsString()
  @IsOptional()
  fax?: string;

  @ApiPropertyOptional({ description: 'Site web' })
  @IsString()
  @IsOptional()
  website?: string;

  @ApiPropertyOptional({ description: 'Adresse' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: 'Ville' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ description: 'Pays' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({ description: 'Code postal' })
  @IsString()
  @IsOptional()
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Numéro fiscal' })
  @IsString()
  @IsOptional()
  taxId?: string;

  @ApiPropertyOptional({ description: 'Numéro de registre' })
  @IsString()
  @IsOptional()
  registrationNumber?: string;

  @ApiPropertyOptional({ enum: PaymentTerms, default: PaymentTerms.NET_30 })
  @IsEnum(PaymentTerms)
  @IsOptional()
  paymentTerms?: PaymentTerms;

  @ApiPropertyOptional({ description: 'Devise', default: 'XOF' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ description: 'Nom de la banque' })
  @IsString()
  @IsOptional()
  bankName?: string;

  @ApiPropertyOptional({ description: 'Compte bancaire' })
  @IsString()
  @IsOptional()
  bankAccount?: string;

  @ApiPropertyOptional({ description: 'IBAN' })
  @IsString()
  @IsOptional()
  bankIban?: string;

  @ApiPropertyOptional({ description: 'Limite de crédit' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  creditLimit?: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Catégories de produits', type: [String] })
  @IsArray()
  @IsOptional()
  categories?: string[];
}

export class UpdateSupplierDto {
  @ApiPropertyOptional({ description: 'Nom du fournisseur' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Nom du contact' })
  @IsString()
  @IsOptional()
  contactName?: string;

  @ApiPropertyOptional({ description: 'Email' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Téléphone' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'Adresse' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: 'Ville' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ description: 'Pays' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({ enum: SupplierStatus })
  @IsEnum(SupplierStatus)
  @IsOptional()
  status?: SupplierStatus;

  @ApiPropertyOptional({ enum: PaymentTerms })
  @IsEnum(PaymentTerms)
  @IsOptional()
  paymentTerms?: PaymentTerms;

  @ApiPropertyOptional({ description: 'Limite de crédit' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  creditLimit?: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Catégories de produits', type: [String] })
  @IsArray()
  @IsOptional()
  categories?: string[];
}

export class SupplierQueryDto {
  @ApiPropertyOptional({ description: 'Recherche par nom ou code' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: SupplierStatus })
  @IsEnum(SupplierStatus)
  @IsOptional()
  status?: SupplierStatus;

  @ApiPropertyOptional({ description: 'Filtrer par ville' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ description: 'Filtrer par pays' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({ description: 'Page', default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Limite', default: 20 })
  @IsOptional()
  limit?: number;
}
