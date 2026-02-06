// src/deliveries/dto/update-status.dto.ts
import { IsEnum, IsOptional, IsString, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeliveryStatus } from '../entities/delivery.entity';

export class UpdateDeliveryStatusDto {
  @ApiProperty({ enum: DeliveryStatus, description: 'Nouveau statut' })
  @IsEnum(DeliveryStatus)
  status: DeliveryStatus;

  @ApiPropertyOptional({ description: 'Note ou commentaire' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ description: 'Raison de l\'échec (si FAILED)' })
  @IsOptional()
  @IsString()
  failureReason?: string;

  @ApiPropertyOptional({ description: 'Nom de la personne qui a réceptionné' })
  @IsOptional()
  @IsString()
  receivedBy?: string;

  @ApiPropertyOptional({ description: 'URL de la signature' })
  @IsOptional()
  @IsString()
  signatureUrl?: string;

  @ApiPropertyOptional({ description: 'URL de la photo preuve' })
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @ApiPropertyOptional({ description: 'Latitude position actuelle' })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude position actuelle' })
  @IsOptional()
  @IsNumber()
  longitude?: number;
}
