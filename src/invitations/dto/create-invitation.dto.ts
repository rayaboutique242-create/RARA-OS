// src/invitations/dto/create-invitation.dto.ts
import { IsEmail, IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum InvitationRole {
  PDG = 'PDG',
  MANAGER = 'MANAGER',
  GESTIONNAIRE = 'GESTIONNAIRE',
  VENDEUR = 'VENDEUR',
  LIVREUR = 'LIVREUR',
}

export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export class CreateInvitationDto {
  @ApiPropertyOptional({ description: 'Email de la personne invitée' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Téléphone de la personne invitée' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ enum: InvitationRole, description: 'Rôle attribué' })
  @IsEnum(InvitationRole)
  role: InvitationRole;

  @ApiPropertyOptional({ description: 'ID du point de vente assigné' })
  @IsOptional()
  @IsString()
  storeId?: string;

  @ApiPropertyOptional({ description: 'Date d\'expiration de l\'invitation' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'Message personnalisé' })
  @IsOptional()
  @IsString()
  message?: string;
}

export class RespondInvitationDto {
  @ApiProperty({ description: 'Code de l\'invitation' })
  @IsString()
  invitationCode: string;

  @ApiProperty({ description: 'Action: accept ou reject' })
  @IsEnum(['accept', 'reject'])
  action: 'accept' | 'reject';
}

export class JoinByCodeDto {
  @ApiProperty({ description: 'Code d\'invitation ou code entreprise' })
  @IsString()
  code: string;
}

export class JoinByLinkDto {
  @ApiProperty({ description: 'Token du lien d\'invitation' })
  @IsString()
  token: string;
}
