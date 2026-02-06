// src/audit/dto/query-data-history.dto.ts
import { IsOptional, IsString, IsDateString, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class QueryDataHistoryDto {
  @ApiPropertyOptional({ description: 'Type d\'entité', example: 'Product' })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional({ description: 'ID de l\'entité' })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({ description: 'ID de l\'utilisateur qui a fait la modification' })
  @IsOptional()
  @IsString()
  changedBy?: string;

  @ApiPropertyOptional({ description: 'Type de changement', enum: ['CREATE', 'UPDATE', 'DELETE', 'RESTORE'] })
  @IsOptional()
  @IsString()
  changeType?: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE';

  @ApiPropertyOptional({ description: 'Date de début' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Date de fin' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Numéro de page', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Éléments par page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
