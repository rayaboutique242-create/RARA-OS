// src/webhooks/dto/create-webhook.dto.ts
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsUrl,
  IsOptional,
  IsBoolean,
  IsArray,
  IsEnum,
  IsNumber,
  MinLength,
  MaxLength,
  IsDateString,
} from 'class-validator';
import { WebhookEvent, WebhookStatus } from '../entities/webhook.entity';

export class CreateWebhookDto {
  @ApiProperty({ description: 'Nom du webhook' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: 'Description du webhook' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ description: 'URL de destination' })
  @IsUrl()
  url: string;

  @ApiProperty({ description: 'Evenements a ecouter', type: [String], enum: WebhookEvent })
  @IsArray()
  @IsEnum(WebhookEvent, { each: true })
  events: WebhookEvent[];

  @ApiPropertyOptional({ description: 'Activer le webhook', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Cle secrete pour la signature' })
  @IsOptional()
  @IsString()
  secret?: string;

  @ApiPropertyOptional({ description: 'En-tetes HTTP personnalises' })
  @IsOptional()
  headers?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Verifier le certificat SSL', default: true })
  @IsOptional()
  @IsBoolean()
  verifySSL?: boolean;

  @ApiPropertyOptional({ description: 'Nombre max de tentatives', default: 3 })
  @IsOptional()
  @IsNumber()
  maxRetries?: number;

  @ApiPropertyOptional({ description: 'Timeout en secondes', default: 30 })
  @IsOptional()
  @IsNumber()
  timeoutSeconds?: number;
}

export class UpdateWebhookDto extends PartialType(CreateWebhookDto) {
  @ApiPropertyOptional({ description: 'Statut du webhook', enum: WebhookStatus })
  @IsOptional()
  @IsEnum(WebhookStatus)
  status?: WebhookStatus;
}

export class TestWebhookDto {
  @ApiPropertyOptional({ description: 'Type evenement pour le test', enum: WebhookEvent })
  @IsOptional()
  @IsEnum(WebhookEvent)
  event?: WebhookEvent;

  @ApiPropertyOptional({ description: 'Payload de test' })
  @IsOptional()
  payload?: any;
}

export class TriggerWebhookDto {
  @ApiProperty({ description: 'Type evenement', enum: WebhookEvent })
  @IsEnum(WebhookEvent)
  event: WebhookEvent;

  @ApiProperty({ description: 'Donnees de evenement' })
  data: any;

  @ApiPropertyOptional({ description: 'ID de entite concernee' })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({ description: 'Type entite' })
  @IsOptional()
  @IsString()
  entityType?: string;
}

export class WebhookQueryDto {
  @ApiPropertyOptional({ description: 'Recherche par nom' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filtrer par statut actif' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Filtrer par statut', enum: WebhookStatus })
  @IsOptional()
  @IsEnum(WebhookStatus)
  status?: WebhookStatus;

  @ApiPropertyOptional({ description: 'Filtrer par evenement', enum: WebhookEvent })
  @IsOptional()
  @IsEnum(WebhookEvent)
  event?: WebhookEvent;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumber()
  limit?: number;
}

export class WebhookLogQueryDto {
  @ApiPropertyOptional({ description: 'ID du webhook' })
  @IsOptional()
  @IsNumber()
  webhookId?: number;

  @ApiPropertyOptional({ description: 'Filtrer par evenement', enum: WebhookEvent })
  @IsOptional()
  @IsEnum(WebhookEvent)
  event?: WebhookEvent;

  @ApiPropertyOptional({ description: 'Statut de livraison' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Date de debut' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Date de fin' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @IsNumber()
  limit?: number;
}
