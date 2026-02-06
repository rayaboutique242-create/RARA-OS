// src/auth/dto/change-password.dto.ts
import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Mot de passe actuel' })
  @IsString()
  @IsNotEmpty({ message: 'Mot de passe actuel requis' })
  currentPassword: string;

  @ApiProperty({ example: 'NewP@ssw0rd!', description: 'Nouveau mot de passe (min 8 chars, 1 majuscule, 1 chiffre)' })
  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  @Matches(/^(?=.*[A-Z])(?=.*\d)/, {
    message: 'Le mot de passe doit contenir au moins une majuscule et un chiffre',
  })
  newPassword: string;
}
