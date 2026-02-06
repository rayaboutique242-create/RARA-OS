// src/auth/dto/login.dto.ts
import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
    @ApiProperty({ example: 'admin@raya.com', description: 'Adresse email de l utilisateur' })
    @IsEmail({}, { message: 'Email invalide' })
    email: string;

    @ApiProperty({ example: 'Admin123!', description: 'Mot de passe (min 6 caracteres)' })
    @IsString()
    @MinLength(6, { message: 'Le mot de passe doit contenir au moins 6 caracteres' })
    password: string;
}
