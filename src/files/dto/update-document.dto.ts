// src/files/dto/update-document.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateDocumentDto } from './create-document.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateDocumentDto extends PartialType(CreateDocumentDto) {
  @ApiPropertyOptional({ description: 'Document actif' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ApproveDocumentDto {
  @ApiPropertyOptional({ description: 'Notes approbation' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectDocumentDto {
  @ApiPropertyOptional({ description: 'Raison du rejet' })
  @IsOptional()
  @IsString()
  reason?: string;
}
