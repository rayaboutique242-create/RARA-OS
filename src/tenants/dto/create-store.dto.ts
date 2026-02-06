// src/tenants/dto/create-store.dto.ts
import { IsString, IsEmail, IsOptional, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStoreDto {
  @ApiProperty({ description: 'Nom du magasin', example: 'Boutique Cocody' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ description: 'Type de magasin', example: 'BRANCH' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  type?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Email du magasin', example: 'cocody@maboutique.ci' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ description: 'Telephone', example: '+22507222222' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ description: 'Adresse complete' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Ville', example: 'Abidjan' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ description: 'Quartier', example: 'Cocody' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  district?: string;

  @ApiPropertyOptional({ description: 'Latitude GPS', example: '5.3364' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  latitude?: string;

  @ApiPropertyOptional({ description: 'Longitude GPS', example: '-4.0267' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  longitude?: string;

  @ApiPropertyOptional({ description: 'Nom du gerant', example: 'Aminata Diallo' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  managerName?: string;

  @ApiPropertyOptional({ description: 'Email du gerant' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  managerEmail?: string;

  @ApiPropertyOptional({ description: 'Telephone du gerant' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  managerPhone?: string;

  @ApiPropertyOptional({ description: 'Horaires ouverture JSON' })
  @IsOptional()
  @IsString()
  openingHours?: string;
}
