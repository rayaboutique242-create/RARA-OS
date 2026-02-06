// src/deliveries/dto/assign-delivery.dto.ts
import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignDeliveryDto {
  @ApiProperty({ description: 'UUID du livreur' })
  @IsUUID()
  deliveryPersonId: string;

  @ApiProperty({ example: 'Ahmed Livreur', description: 'Nom du livreur' })
  @IsString()
  deliveryPersonName: string;

  @ApiProperty({ example: '+212 6XX XXX XXX', description: 'Téléphone du livreur' })
  @IsString()
  deliveryPersonPhone: string;

  @ApiPropertyOptional({ description: 'Note pour le livreur' })
  @IsOptional()
  @IsString()
  note?: string;
}
