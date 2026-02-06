// src/notifications/dto/create-notification.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsEmail,
  IsObject,
} from 'class-validator';
import {
  NotificationType,
  NotificationChannel,
} from '../entities/notification.entity';

export class CreateNotificationDto {
  @ApiPropertyOptional({ description: 'ID utilisateur destinataire' })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiProperty({ enum: NotificationType, default: NotificationType.INFO })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ enum: NotificationChannel, default: NotificationChannel.IN_APP })
  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @ApiProperty({ description: 'Titre de la notification' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Message de la notification' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: 'Données supplémentaires' })
  @IsObject()
  @IsOptional()
  data?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Lien associé' })
  @IsString()
  @IsOptional()
  link?: string;

  @ApiPropertyOptional({ description: 'Email du destinataire' })
  @IsEmail()
  @IsOptional()
  recipientEmail?: string;

  @ApiPropertyOptional({ description: 'Téléphone du destinataire' })
  @IsString()
  @IsOptional()
  recipientPhone?: string;
}

export class SendEmailDto {
  @ApiProperty({ description: 'Email destinataire' })
  @IsEmail()
  to: string;

  @ApiProperty({ description: 'Sujet de l\'email' })
  @IsString()
  subject: string;

  @ApiProperty({ description: 'Corps de l\'email (HTML)' })
  @IsString()
  body: string;

  @ApiPropertyOptional({ description: 'Template à utiliser' })
  @IsString()
  @IsOptional()
  template?: string;

  @ApiPropertyOptional({ description: 'Variables du template' })
  @IsObject()
  @IsOptional()
  variables?: Record<string, any>;
}

export class BulkNotificationDto {
  @ApiProperty({ description: 'Liste des IDs utilisateurs', type: [String] })
  @IsString({ each: true })
  userIds: string[];

  @ApiProperty({ enum: NotificationType })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ description: 'Titre' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Message' })
  @IsString()
  message: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  data?: Record<string, any>;
}
