// src/appointments/dto/service-offering.dto.ts
import { IsString, IsOptional, IsNumber, IsBoolean, IsEnum, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceCategory } from '../entities/service-offering.entity';

export class CreateServiceOfferingDto {
  @ApiProperty({ description: 'Nom du service' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Description du service' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ServiceCategory, description: 'Catégorie du service' })
  @IsOptional()
  @IsEnum(ServiceCategory)
  category?: ServiceCategory;

  @ApiPropertyOptional({ description: 'Durée en minutes', default: 30 })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(480)
  durationMinutes?: number;

  @ApiPropertyOptional({ description: 'Prix du service' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ description: 'Devise', default: 'XOF' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Service gratuit' })
  @IsOptional()
  @IsBoolean()
  isFree?: boolean;

  @ApiPropertyOptional({ description: 'Acompte requis' })
  @IsOptional()
  @IsBoolean()
  requiresDeposit?: boolean;

  @ApiPropertyOptional({ description: 'Montant de l\'acompte' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  depositAmount?: number;

  @ApiPropertyOptional({ description: 'Nombre max de participants' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxParticipants?: number;

  @ApiPropertyOptional({ description: 'URL de l\'image' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Couleur (hex)', default: '#3498db' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'Notes de préparation' })
  @IsOptional()
  @IsString()
  preparationNotes?: string;
}

export class UpdateServiceOfferingDto {
  @ApiPropertyOptional({ description: 'Nom du service' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Description du service' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ServiceCategory })
  @IsOptional()
  @IsEnum(ServiceCategory)
  category?: ServiceCategory;

  @ApiPropertyOptional({ description: 'Durée en minutes' })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(480)
  durationMinutes?: number;

  @ApiPropertyOptional({ description: 'Prix du service' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ description: 'Service actif' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Acompte requis' })
  @IsOptional()
  @IsBoolean()
  requiresDeposit?: boolean;

  @ApiPropertyOptional({ description: 'Montant de l\'acompte' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  depositAmount?: number;

  @ApiPropertyOptional({ description: 'Nombre max de participants' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxParticipants?: number;

  @ApiPropertyOptional({ description: 'URL de l\'image' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Couleur (hex)' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'Ordre de tri' })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Notes de préparation' })
  @IsOptional()
  @IsString()
  preparationNotes?: string;
}
