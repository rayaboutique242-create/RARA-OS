// src/support/dto/create-ticket.dto.ts
import { IsString, IsOptional, IsEnum, IsArray, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketPriority, TicketCategory } from '../entities/support-ticket.entity';

export class CreateTicketDto {
  @ApiProperty({ description: 'Sujet du ticket', example: 'Problème de connexion' })
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  subject: string;

  @ApiProperty({ description: 'Description détaillée du problème' })
  @IsString()
  @MinLength(10)
  description: string;

  @ApiPropertyOptional({ enum: TicketPriority, default: TicketPriority.MEDIUM })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiPropertyOptional({ enum: TicketCategory, default: TicketCategory.GENERAL })
  @IsOptional()
  @IsEnum(TicketCategory)
  category?: TicketCategory;

  @ApiPropertyOptional({ description: 'Tags pour organiser le ticket' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Pièces jointes' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}

export class UpdateTicketDto {
  @ApiPropertyOptional({ description: 'Nouveau sujet' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  subject?: string;

  @ApiPropertyOptional({ enum: TicketPriority })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiPropertyOptional({ enum: TicketCategory })
  @IsOptional()
  @IsEnum(TicketCategory)
  category?: TicketCategory;

  @ApiPropertyOptional({ description: 'Tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class AssignTicketDto {
  @ApiProperty({ description: 'ID de l\'agent support' })
  assignedToId: number;

  @ApiPropertyOptional({ description: 'Nom de l\'agent' })
  @IsOptional()
  @IsString()
  assignedToName?: string;
}

export class AddResponseDto {
  @ApiProperty({ description: 'Contenu de la réponse' })
  @IsString()
  @MinLength(1)
  content: string;

  @ApiPropertyOptional({ description: 'Note interne (visible seulement par le support)' })
  @IsOptional()
  isInternal?: boolean;

  @ApiPropertyOptional({ description: 'Pièces jointes' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}

export class RateTicketDto {
  @ApiProperty({ description: 'Note de satisfaction (1-5)', minimum: 1, maximum: 5 })
  rating: number;

  @ApiPropertyOptional({ description: 'Commentaire' })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class TicketQueryDto {
  @ApiPropertyOptional({ enum: ['OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'WAITING_SUPPORT', 'RESOLVED', 'CLOSED'] })
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] })
  @IsOptional()
  priority?: string;

  @ApiPropertyOptional({ enum: ['GENERAL', 'TECHNICAL', 'BILLING', 'ACCOUNT', 'FEATURE_REQUEST', 'BUG_REPORT', 'OTHER'] })
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ description: 'ID de l\'agent assigné' })
  @IsOptional()
  assignedToId?: number;

  @ApiPropertyOptional({ description: 'Recherche par sujet ou numéro' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  limit?: number;
}
