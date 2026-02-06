// src/deliveries/dto/create-delivery.dto.ts
import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsNumber,
  IsDateString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeliveryPriority } from '../entities/delivery.entity';

export class CreateDeliveryDto {
  @ApiProperty({ description: 'UUID de la commande associée' })
  @IsUUID()
  orderId: string;

  @ApiProperty({ example: 'Mohammed Alami', description: 'Nom du destinataire' })
  @IsString()
  recipientName: string;

  @ApiProperty({ example: '+212 6XX XXX XXX', description: 'Téléphone du destinataire' })
  @IsString()
  recipientPhone: string;

  @ApiProperty({ example: '123 Rue Hassan II, Casablanca', description: 'Adresse complète' })
  @IsString()
  deliveryAddress: string;

  @ApiPropertyOptional({ example: 'Casablanca' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: '20000' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ example: 33.5731 })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ example: -7.5898 })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ example: '2026-01-31', description: 'Date de livraison prévue' })
  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @ApiPropertyOptional({ example: '09:00-12:00', description: 'Créneau horaire' })
  @IsOptional()
  @IsString()
  scheduledTimeSlot?: string;

  @ApiPropertyOptional({ enum: DeliveryPriority, default: DeliveryPriority.NORMAL })
  @IsOptional()
  @IsEnum(DeliveryPriority)
  priority?: DeliveryPriority;

  @ApiPropertyOptional({ example: 30, description: 'Frais de livraison en MAD' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryFee?: number;

  @ApiPropertyOptional({ description: 'Instructions spéciales pour le livreur' })
  @IsOptional()
  @IsString()
  specialInstructions?: string;

  @ApiPropertyOptional({ description: 'Notes internes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
