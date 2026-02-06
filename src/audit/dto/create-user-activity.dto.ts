// src/audit/dto/create-user-activity.dto.ts
import { IsString, IsOptional, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserActivityDto {
  @ApiProperty({ description: 'Type activite', example: 'PAGE_VIEW' })
  @IsString()
  activityType: string;

  @ApiPropertyOptional({ description: 'Module', example: 'PRODUCTS' })
  @IsOptional()
  @IsString()
  module?: string;

  @ApiPropertyOptional({ description: 'Page visitee', example: '/products/list' })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({ description: 'Fonctionnalite utilisee', example: 'search' })
  @IsOptional()
  @IsString()
  feature?: string;

  @ApiPropertyOptional({ description: 'Details additionnels' })
  @IsOptional()
  details?: any;

  @ApiPropertyOptional({ description: 'Duree en secondes' })
  @IsOptional()
  @IsInt()
  duration?: number;

  @ApiPropertyOptional({ description: 'ID de session' })
  @IsOptional()
  @IsString()
  sessionId?: string;
}
