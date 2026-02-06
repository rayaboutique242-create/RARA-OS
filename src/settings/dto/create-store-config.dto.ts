// src/settings/dto/create-store-config.dto.ts
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsEmail,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';
import { BusinessType, InventoryMethod } from '../entities/store-config.entity';

export class CreateStoreConfigDto {
  @ApiProperty({ description: 'Nom de la boutique', example: 'Boutique Raya' })
  @IsString()
  @MaxLength(150)
  storeName: string;

  @ApiPropertyOptional({ description: 'Raison sociale' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  legalName?: string;

  @ApiPropertyOptional({ enum: BusinessType, default: BusinessType.RETAIL })
  @IsOptional()
  @IsEnum(BusinessType)
  businessType?: BusinessType;

  @ApiPropertyOptional({ description: 'Numéro RCCM' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  registrationNumber?: string;

  @ApiPropertyOptional({ description: 'Numéro de TVA' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  taxId?: string;

  @ApiPropertyOptional({ description: 'Logo (URL ou Base64)' })
  @IsOptional()
  @IsString()
  logo?: string;

  // === Coordonnées ===
  @ApiPropertyOptional({ description: 'Adresse complète' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Ville', example: 'Abidjan' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ description: 'Pays', example: 'Côte d\'Ivoire' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({ description: 'Téléphone' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ description: 'Mobile' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  mobile?: string;

  @ApiPropertyOptional({ description: 'Email' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Site web' })
  @IsOptional()
  @IsString()
  website?: string;

  // === Localisation ===
  @ApiPropertyOptional({ description: 'Langue par défaut', example: 'fr' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  defaultLanguage?: string;

  @ApiPropertyOptional({ description: 'Fuseau horaire', example: 'Africa/Abidjan' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  @ApiPropertyOptional({ description: 'Format de date', example: 'DD/MM/YYYY' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  dateFormat?: string;

  // === Devise & Taxes ===
  @ApiPropertyOptional({ description: 'Devise par défaut', example: 'XOF' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  defaultCurrency?: string;

  @ApiPropertyOptional({ description: 'Activer les taxes' })
  @IsOptional()
  @IsBoolean()
  taxEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Prix TTC' })
  @IsOptional()
  @IsBoolean()
  pricesIncludeTax?: boolean;

  // === Inventaire ===
  @ApiPropertyOptional({ enum: InventoryMethod })
  @IsOptional()
  @IsEnum(InventoryMethod)
  inventoryMethod?: InventoryMethod;

  @ApiPropertyOptional({ description: 'Suivre l\'inventaire' })
  @IsOptional()
  @IsBoolean()
  trackInventory?: boolean;

  @ApiPropertyOptional({ description: 'Autoriser stock négatif' })
  @IsOptional()
  @IsBoolean()
  allowNegativeStock?: boolean;

  @ApiPropertyOptional({ description: 'Seuil d\'alerte stock bas' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  lowStockThreshold?: number;

  // === Commandes ===
  @ApiPropertyOptional({ description: 'Préfixe commande', example: 'CMD-' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  orderPrefix?: string;

  @ApiPropertyOptional({ description: 'Numéro de départ' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  orderStartNumber?: number;

  // === Factures ===
  @ApiPropertyOptional({ description: 'Préfixe facture', example: 'FAC-' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  invoicePrefix?: string;

  @ApiPropertyOptional({ description: 'Pied de facture' })
  @IsOptional()
  @IsString()
  invoiceFooter?: string;

  // === Reçus ===
  @ApiPropertyOptional({ description: 'Préfixe reçu', example: 'REC-' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  receiptPrefix?: string;

  @ApiPropertyOptional({ description: 'En-tête de reçu' })
  @IsOptional()
  @IsString()
  receiptHeader?: string;

  @ApiPropertyOptional({ description: 'Pied de reçu' })
  @IsOptional()
  @IsString()
  receiptFooter?: string;

  // === Heures d'ouverture ===
  @ApiPropertyOptional({
    description: 'Heures d\'ouverture (JSON)',
    example: { monday: { open: '08:00', close: '18:00' } },
  })
  @IsOptional()
  businessHours?: Record<string, { open: string; close: string }>;

  // === Réseaux sociaux ===
  @ApiPropertyOptional({ description: 'Facebook URL' })
  @IsOptional()
  @IsString()
  facebookUrl?: string;

  @ApiPropertyOptional({ description: 'Instagram URL' })
  @IsOptional()
  @IsString()
  instagramUrl?: string;

  @ApiPropertyOptional({ description: 'WhatsApp' })
  @IsOptional()
  @IsString()
  whatsappNumber?: string;

  // === Thème ===
  @ApiPropertyOptional({ description: 'Couleur principale', example: '#1976D2' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  primaryColor?: string;

  @ApiPropertyOptional({ description: 'Thème', example: 'light' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  theme?: string;

  // === Fonctionnalités ===
  @ApiPropertyOptional({ description: 'Activer POS' })
  @IsOptional()
  @IsBoolean()
  enablePOS?: boolean;

  @ApiPropertyOptional({ description: 'Activer E-commerce' })
  @IsOptional()
  @IsBoolean()
  enableEcommerce?: boolean;

  @ApiPropertyOptional({ description: 'Activer Livraison' })
  @IsOptional()
  @IsBoolean()
  enableDelivery?: boolean;

  @ApiPropertyOptional({ description: 'Mode maintenance' })
  @IsOptional()
  @IsBoolean()
  maintenanceMode?: boolean;

  @ApiPropertyOptional({ description: 'Message maintenance' })
  @IsOptional()
  @IsString()
  maintenanceMessage?: string;
}

export class UpdateStoreConfigDto extends PartialType(CreateStoreConfigDto) {}

export class BusinessHoursDto {
  @ApiProperty({
    description: 'Heures d\'ouverture par jour',
    example: {
      monday: { open: '08:00', close: '18:00', closed: false },
      tuesday: { open: '08:00', close: '18:00', closed: false },
      wednesday: { open: '08:00', close: '18:00', closed: false },
      thursday: { open: '08:00', close: '18:00', closed: false },
      friday: { open: '08:00', close: '18:00', closed: false },
      saturday: { open: '09:00', close: '14:00', closed: false },
      sunday: { closed: true },
    },
  })
  hours: Record<string, { open?: string; close?: string; closed?: boolean }>;
}
