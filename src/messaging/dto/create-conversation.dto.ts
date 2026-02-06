// src/messaging/dto/create-conversation.dto.ts
import { IsString, IsOptional, IsEnum, IsArray, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConversationType } from '../entities/conversation.entity';

export class CreateConversationDto {
  @ApiPropertyOptional({ description: 'Titre de la conversation (requis pour GROUP/BROADCAST)' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Description de la conversation' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ConversationType, description: 'Type de conversation' })
  @IsEnum(ConversationType)
  type: ConversationType;

  @ApiProperty({ type: [Number], description: 'IDs des participants' })
  @IsArray()
  @IsNumber({}, { each: true })
  participantIds: number[];

  @ApiPropertyOptional({ description: 'Métadonnées additionnelles' })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class AddParticipantsDto {
  @ApiProperty({ type: [Number], description: 'IDs des utilisateurs à ajouter' })
  @IsArray()
  @IsNumber({}, { each: true })
  userIds: number[];
}

export class RemoveParticipantsDto {
  @ApiProperty({ type: [Number], description: 'IDs des utilisateurs à retirer' })
  @IsArray()
  @IsNumber({}, { each: true })
  userIds: number[];
}

export class UpdateConversationDto {
  @ApiPropertyOptional({ description: 'Nouveau titre' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Nouvelle description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Épingler la conversation' })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @ApiPropertyOptional({ description: 'Mettre en sourdine' })
  @IsOptional()
  @IsBoolean()
  isMuted?: boolean;
}
