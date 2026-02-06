// src/tenants/dto/update-store.dto.ts
import { PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateStoreDto } from './create-store.dto';

export class UpdateStoreDto extends PartialType(CreateStoreDto) {
  @ApiPropertyOptional({ description: 'Statut du magasin', example: 'ACTIVE' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  status?: string;

  @ApiPropertyOptional({ description: 'Configuration JSON personnalisee' })
  @IsOptional()
  @IsString()
  customSettings?: string;

  @ApiPropertyOptional({ description: 'Notes internes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
