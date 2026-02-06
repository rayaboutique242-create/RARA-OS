// src/messaging/dto/presence.dto.ts
import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PresenceStatus } from '../entities/user-presence.entity';

export class UpdatePresenceDto {
  @ApiProperty({ enum: PresenceStatus, description: 'Statut de présence' })
  @IsEnum(PresenceStatus)
  status: PresenceStatus;

  @ApiPropertyOptional({ description: 'Message de statut personnalisé' })
  @IsOptional()
  @IsString()
  statusMessage?: string;
}

export class UpdatePresenceSettingsDto {
  @ApiPropertyOptional({ description: 'Afficher le statut en ligne' })
  @IsOptional()
  @IsBoolean()
  showOnlineStatus?: boolean;

  @ApiPropertyOptional({ description: 'Afficher "vu dernièrement"' })
  @IsOptional()
  @IsBoolean()
  showLastSeen?: boolean;
}
