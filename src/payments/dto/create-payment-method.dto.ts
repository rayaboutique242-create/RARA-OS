// src/payments/dto/create-payment-method.dto.ts
import { IsString, IsEnum, IsOptional, IsNumber, IsBoolean, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { PaymentMethodType, MobileMoneyProvider } from '../entities/payment-method.entity';

export class CreatePaymentMethodDto {
  @ApiProperty({ description: 'Nom de la méthode de paiement', example: 'Orange Money' })
  @IsString()
  name: string;

  @ApiProperty({ enum: PaymentMethodType, description: 'Type de paiement' })
  @IsEnum(PaymentMethodType)
  type: PaymentMethodType;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: MobileMoneyProvider, description: 'Fournisseur mobile money' })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional({ description: 'Numéro de compte', example: '+22507000000' })
  @IsOptional()
  @IsString()
  accountNumber?: string;

  @ApiPropertyOptional({ description: 'Nom du compte' })
  @IsOptional()
  @IsString()
  accountName?: string;

  @ApiPropertyOptional({ description: 'Frais en pourcentage', example: 1.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  transactionFeePercent?: number;

  @ApiPropertyOptional({ description: 'Frais fixes', example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  transactionFeeFixed?: number;

  @ApiPropertyOptional({ description: 'Montant minimum' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minAmount?: number;

  @ApiPropertyOptional({ description: 'Montant maximum' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxAmount?: number;

  @ApiPropertyOptional({ description: 'Méthode active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Méthode par défaut', default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: 'Autorise les remboursements', default: true })
  @IsOptional()
  @IsBoolean()
  allowRefunds?: boolean;

  @ApiPropertyOptional({ description: 'Devise', default: 'XOF' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Ordre d\'affichage' })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Icône' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: 'Instructions d\'utilisation' })
  @IsOptional()
  @IsString()
  instructions?: string;
}

export class UpdatePaymentMethodDto extends PartialType(CreatePaymentMethodDto) {}

export class PaymentMethodQueryDto {
  @ApiPropertyOptional({ enum: PaymentMethodType })
  @IsOptional()
  @IsEnum(PaymentMethodType)
  type?: PaymentMethodType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
