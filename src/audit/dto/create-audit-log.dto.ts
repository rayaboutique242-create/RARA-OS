// src/audit/dto/create-audit-log.dto.ts
import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAuditLogDto {
  @ApiProperty({ description: 'Action effectuee', example: 'CREATE' })
  @IsString()
  action: string;

  @ApiProperty({ description: 'Module concerne', example: 'PRODUCTS' })
  @IsString()
  module: string;

  @ApiPropertyOptional({ description: 'Type entite', example: 'Product' })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional({ description: 'ID entite', example: 'uuid-123' })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({ description: 'Nom entite', example: 'Produit XYZ' })
  @IsOptional()
  @IsString()
  entityName?: string;

  @ApiPropertyOptional({ description: 'Description de action' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Anciennes valeurs (JSON)' })
  @IsOptional()
  oldValues?: any;

  @ApiPropertyOptional({ description: 'Nouvelles valeurs (JSON)' })
  @IsOptional()
  newValues?: any;

  @ApiPropertyOptional({ description: 'Metadonnees additionnelles' })
  @IsOptional()
  metadata?: any;
}
