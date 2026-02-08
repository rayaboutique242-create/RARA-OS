// src/auth/dto/register.dto.ts
import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../common/constants/roles';

/**
 * All roles allowed during registration (invitation-based registration
 * can assign higher roles like MANAGER, GESTIONNAIRE).
 * The actual role is enforced by the invitation system and PDG approval.
 */
const ALLOWED_REGISTER_ROLES = [Role.PDG, Role.MANAGER, Role.GESTIONNAIRE, Role.VENDEUR, Role.LIVREUR] as const;

export class RegisterDto {
    @ApiProperty({ example: 'user@example.com', description: 'Adresse email unique' })
    @IsEmail({}, { message: 'Email invalide' })
    email: string;

    @ApiPropertyOptional({ example: 'johndoe', description: 'Nom d utilisateur unique (auto-genere si non fourni)' })
    @IsOptional()
    @IsString()
    @MinLength(3, { message: 'Le username doit contenir au moins 3 caracteres' })
    username?: string;

    @ApiProperty({ example: 'SecurePass123!', description: 'Mot de passe (min 6 caracteres)' })
    @IsString()
    @MinLength(6, { message: 'Le mot de passe doit contenir au moins 6 caracteres' })
    password: string;

    @ApiPropertyOptional({ example: 'John', description: 'Prenom' })
    @IsOptional()
    @IsString()
    firstName?: string;

    @ApiPropertyOptional({ example: 'Doe', description: 'Nom de famille' })
    @IsOptional()
    @IsString()
    lastName?: string;

    @ApiPropertyOptional({ example: '+212 6XX XXX XXX', description: 'Numero de telephone' })
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiPropertyOptional({
        example: 'VENDEUR',
        description: 'Role assigne (tous les roles sont permis via invitation)',
        enum: ALLOWED_REGISTER_ROLES,
    })
    @IsOptional()
    @IsEnum([Role.PDG, Role.MANAGER, Role.GESTIONNAIRE, Role.VENDEUR, Role.LIVREUR], { message: 'R\u00f4le invalide' })
    role?: Role;

    @ApiProperty({ example: 'tenant-001', description: 'Identifiant du tenant (entreprise)' })
    @IsString()
    tenantId: string;
}
