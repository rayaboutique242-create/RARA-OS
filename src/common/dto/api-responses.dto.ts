// src/common/dto/api-responses.dto.ts
import { ApiProperty } from '@nestjs/swagger';

// ======================== AUTH RESPONSES ========================
export class AuthUserResponse {
    @ApiProperty({ example: 'uuid-user-001', description: 'ID unique de l utilisateur' })
    id: string;

    @ApiProperty({ example: 'admin@raya.com', description: 'Email' })
    email: string;

    @ApiProperty({ example: 'admin', description: 'Nom d utilisateur' })
    username: string;

    @ApiProperty({ example: 'PDG', enum: ['PDG', 'MANAGER', 'GESTIONNAIRE', 'VENDEUR', 'CAISSIER'] })
    role: string;

    @ApiProperty({ example: 'tenant-001', description: 'ID du tenant' })
    tenantId: string;

    @ApiProperty({ example: 'Jean', description: 'Prenom', required: false })
    firstName?: string;

    @ApiProperty({ example: 'Dupont', description: 'Nom de famille', required: false })
    lastName?: string;
}

export class LoginResponse {
    @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', description: 'JWT Access Token (expire en 1h)' })
    accessToken: string;

    @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', description: 'JWT Refresh Token (expire en 7j)' })
    refreshToken: string;

    @ApiProperty({ type: AuthUserResponse })
    user: AuthUserResponse;
}

export class RefreshTokenResponse {
    @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', description: 'Nouveau JWT Access Token' })
    accessToken: string;
}

// ======================== PAGINATION ========================
export class PaginationMeta {
    @ApiProperty({ example: 150, description: 'Nombre total d elements' })
    total: number;

    @ApiProperty({ example: 1, description: 'Page actuelle' })
    page: number;

    @ApiProperty({ example: 20, description: 'Elements par page' })
    limit: number;

    @ApiProperty({ example: 8, description: 'Nombre total de pages' })
    totalPages: number;
}

// ======================== ERROR RESPONSES ========================
export class ErrorResponse {
    @ApiProperty({ example: 401 })
    statusCode: number;

    @ApiProperty({ example: 'Identifiants invalides' })
    message: string;

    @ApiProperty({ example: 'Unauthorized' })
    error: string;
}

export class ValidationErrorResponse {
    @ApiProperty({ example: 400 })
    statusCode: number;

    @ApiProperty({ example: ['email doit etre un email valide', 'password est requis'], isArray: true })
    message: string[];

    @ApiProperty({ example: 'Bad Request' })
    error: string;
}
