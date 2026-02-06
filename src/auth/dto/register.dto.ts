// src/auth/dto/register.dto.ts
import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../common/constants/roles';

/**
 * Roles allowed for self-registration.
 * Higher roles (PDG, MANAGER, GESTIONNAIRE) must be assigned by an admin.
 */
const SELF_REGISTER_ROLES = [Role.VENDEUR, Role.LIVREUR] as const;

export class RegisterDto {
    @ApiProperty({ example: 'user@example.com', description: 'Adresse email unique' })
    @IsEmail({}, { message: 'Email invalide' })
    email: string;

    @ApiProperty({ example: 'johndoe', description: 'Nom d utilisateur unique' })
    @IsString()
    @MinLength(3, { message: 'Le username doit contenir au moins 3 caracteres' })
    username: string;

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
        description: 'Role (auto-inscription limitee a VENDEUR ou LIVREUR)',
        enum: SELF_REGISTER_ROLES,
    })
    @IsOptional()
    @IsEnum([Role.VENDEUR, Role.LIVREUR], { message: 'L\'auto-inscription est limitee aux roles VENDEUR et LIVREUR' })
    role?: Role;

    @ApiProperty({ example: 'tenant-001', description: 'Identifiant du tenant (entreprise)' })
    @IsString()
    tenantId: string;
}
