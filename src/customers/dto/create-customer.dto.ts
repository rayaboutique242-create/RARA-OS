// src/customers/dto/create-customer.dto.ts
import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsDateString,
  IsArray,
  Min,
  Max,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerType, CustomerStatus } from '../entities/customer.entity';

export class CreateCustomerDto {
  @ApiProperty({ example: 'Marie', description: 'Prénom du client' })
  @IsString()
  @MinLength(2)
  firstName: string;

  @ApiProperty({ example: 'Dupont', description: 'Nom de famille' })
  @IsString()
  @MinLength(2)
  lastName: string;

  @ApiPropertyOptional({ example: 'marie.dupont@email.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: '+33612345678', description: 'Téléphone principal' })
  @IsString()
  phone: string;

  @ApiPropertyOptional({ example: '+33698765432' })
  @IsOptional()
  @IsString()
  secondaryPhone?: string;

  @ApiPropertyOptional({ example: '1990-05-15' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: 'F', enum: ['M', 'F', 'O'] })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({ example: '25 Rue de la Paix' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Paris' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: '75002' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ example: 'France' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: '30 Avenue des Champs-Élysées' })
  @IsOptional()
  @IsString()
  shippingAddress?: string;

  @ApiPropertyOptional({ example: 'Paris' })
  @IsOptional()
  @IsString()
  shippingCity?: string;

  @ApiPropertyOptional({ example: '75008' })
  @IsOptional()
  @IsString()
  shippingPostalCode?: string;

  @ApiPropertyOptional({ example: 'Dupont SARL', description: 'Nom entreprise (B2B)' })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({ example: 'FR12345678901', description: 'Numéro TVA' })
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiPropertyOptional({ example: 'RCS123456', description: 'N° SIRET/RC' })
  @IsOptional()
  @IsString()
  businessRegNumber?: string;

  @ApiPropertyOptional({ enum: CustomerType, default: CustomerType.INDIVIDUAL })
  @IsOptional()
  @IsEnum(CustomerType)
  customerType?: CustomerType;

  @ApiPropertyOptional({ enum: CustomerStatus, default: CustomerStatus.ACTIVE })
  @IsOptional()
  @IsEnum(CustomerStatus)
  status?: CustomerStatus;

  @ApiPropertyOptional({ example: 'fr', description: 'Langue préférée' })
  @IsOptional()
  @IsString()
  preferredLanguage?: string;

  @ApiPropertyOptional({ example: 'CARD' })
  @IsOptional()
  @IsString()
  preferredPaymentMethod?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  acceptsMarketing?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  acceptsSms?: boolean;

  @ApiPropertyOptional({ example: 10, description: 'Remise spéciale en %' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  specialDiscount?: number;

  @ApiPropertyOptional({ example: 5000, description: 'Limite de crédit' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  creditLimit?: number;

  @ApiPropertyOptional({ example: 'Client fidèle depuis 2020' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: ['premium', 'b2b'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: 'WEBSITE', description: 'Source acquisition' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ example: 'customer-uuid', description: 'Parrain' })
  @IsOptional()
  @IsString()
  referredBy?: string;
}
