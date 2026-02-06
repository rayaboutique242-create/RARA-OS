// src/users/dto/update-user.dto.ts
import { IsOptional, IsString, IsIn, IsEmail, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'Prénom' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ description: 'Nom de famille' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ description: 'Nom d\'utilisateur' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  username?: string;

  @ApiPropertyOptional({ description: 'Téléphone' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'URL de l\'avatar' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ description: 'Statut', enum: ['active', 'inactive', 'suspended'] })
  @IsOptional()
  @IsIn(['active', 'inactive', 'suspended'])
  status?: string;
}

export class UpdateUserRoleDto {
  @ApiPropertyOptional({ description: 'Rôle', enum: ['PDG', 'MANAGER', 'GESTIONNAIRE', 'VENDEUR', 'LIVREUR'] })
  @IsIn(['PDG', 'MANAGER', 'GESTIONNAIRE', 'VENDEUR', 'LIVREUR'])
  role: string;
}

export class QueryUsersDto {
  @ApiPropertyOptional({ description: 'Recherche par nom, email ou username' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filtrer par rôle', enum: ['PDG', 'MANAGER', 'GESTIONNAIRE', 'VENDEUR', 'LIVREUR'] })
  @IsOptional()
  @IsIn(['PDG', 'MANAGER', 'GESTIONNAIRE', 'VENDEUR', 'LIVREUR'])
  role?: string;

  @ApiPropertyOptional({ description: 'Filtrer par statut', enum: ['active', 'inactive', 'suspended'] })
  @IsOptional()
  @IsIn(['active', 'inactive', 'suspended'])
  status?: string;

  @ApiPropertyOptional({ description: 'Filtrer par tenant ID' })
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional({ description: 'Page (par défaut 1)', default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Limite par page (par défaut 20)', default: 20 })
  @IsOptional()
  limit?: number;
}
