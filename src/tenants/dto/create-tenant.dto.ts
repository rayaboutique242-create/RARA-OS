// src/tenants/dto/create-tenant.dto.ts
import { IsString, IsEmail, IsOptional, IsEnum, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessType } from '../entities/tenant.entity';

export class CreateTenantDto {
  @ApiProperty({ description: 'Nom de la boutique', example: 'Ma Boutique' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ description: 'Nom legal', example: 'Ma Boutique SARL' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  legalName?: string;

  @ApiPropertyOptional({ description: 'Numero RCCM', example: 'CI-ABJ-2024-B-12345' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  registrationNumber?: string;

  @ApiPropertyOptional({ description: 'Numero fiscal', example: '1234567890' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  taxId?: string;

  @ApiPropertyOptional({ enum: BusinessType, description: 'Type activite', example: 'BOUTIQUE' })
  @IsOptional()
  @IsEnum(BusinessType)
  businessType?: BusinessType;

  @ApiPropertyOptional({ description: 'Email de contact', example: 'contact@maboutique.ci' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ description: 'Telephone', example: '+22507000000' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ description: 'Site web', example: 'https://maboutique.ci' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  website?: string;

  @ApiPropertyOptional({ description: 'Adresse', example: 'Cocody, Rue des jardins' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Ville', example: 'Abidjan' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ description: 'Nom du proprietaire', example: 'Jean Kouassi' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  ownerName: string;

  @ApiPropertyOptional({ description: 'Email du proprietaire', example: 'jean@email.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  ownerEmail?: string;

  @ApiPropertyOptional({ description: 'Telephone du proprietaire', example: '+22507111111' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  ownerPhone?: string;
}
