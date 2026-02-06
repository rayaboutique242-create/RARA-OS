// src/messaging/dto/create-message.dto.ts
import { IsString, IsOptional, IsEnum, IsArray, IsNumber, IsBoolean, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageType, MessagePriority } from '../entities/message.entity';

export class CreateMessageDto {
  @ApiProperty({ description: 'ID de la conversation' })
  @IsNumber()
  conversationId: number;

  @ApiProperty({ description: 'Contenu du message' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ enum: MessageType, default: MessageType.TEXT })
  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;

  @ApiPropertyOptional({ enum: MessagePriority, default: MessagePriority.NORMAL })
  @IsOptional()
  @IsEnum(MessagePriority)
  priority?: MessagePriority;

  @ApiPropertyOptional({ description: 'ID du message auquel répondre' })
  @IsOptional()
  @IsNumber()
  replyToId?: number;

  @ApiPropertyOptional({ type: [Object], description: 'Pièces jointes' })
  @IsOptional()
  @IsArray()
  attachments?: Array<{
    type: string;
    url: string;
    name: string;
    size?: number;
    mimeType?: string;
  }>;

  @ApiPropertyOptional({ type: [Number], description: 'IDs des utilisateurs mentionnés' })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  mentions?: number[];

  @ApiPropertyOptional({ description: 'Date d\'envoi programmé' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional({ description: 'Date d\'expiration du message' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class EditMessageDto {
  @ApiProperty({ description: 'Nouveau contenu du message' })
  @IsString()
  content: string;
}

export class ForwardMessageDto {
  @ApiProperty({ description: 'ID du message à transférer' })
  @IsNumber()
  messageId: number;

  @ApiProperty({ type: [Number], description: 'IDs des conversations cibles' })
  @IsArray()
  @IsNumber({}, { each: true })
  conversationIds: number[];

  @ApiPropertyOptional({ description: 'Message additionnel' })
  @IsOptional()
  @IsString()
  additionalMessage?: string;
}

export class ReactToMessageDto {
  @ApiProperty({ description: 'Emoji de réaction' })
  @IsString()
  emoji: string;
}

export class MarkAsReadDto {
  @ApiProperty({ description: 'ID de la conversation' })
  @IsNumber()
  conversationId: number;

  @ApiPropertyOptional({ description: 'ID du dernier message lu' })
  @IsOptional()
  @IsNumber()
  lastMessageId?: number;
}

export class SearchMessagesDto {
  @ApiProperty({ description: 'Terme de recherche' })
  @IsString()
  query: string;

  @ApiPropertyOptional({ description: 'ID de la conversation (optionnel)' })
  @IsOptional()
  @IsNumber()
  conversationId?: number;

  @ApiPropertyOptional({ description: 'ID de l\'expéditeur' })
  @IsOptional()
  @IsNumber()
  senderId?: number;

  @ApiPropertyOptional({ enum: MessageType })
  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;

  @ApiPropertyOptional({ description: 'Date de début' })
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

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumber()
  limit?: number;
}
