// src/auth/dto/otp.dto.ts
import { IsString, IsNotEmpty, MinLength, MaxLength, IsEmail, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendOtpDto {
  @ApiProperty({ 
    description: 'Email ou telephone pour recevoir l OTP',
    example: 'user@example.com'
  })
  @IsString()
  @IsNotEmpty({ message: 'Le contact est requis' })
  contact: string;
}

export class VerifyOtpDto {
  @ApiProperty({ 
    description: 'Email ou telephone',
    example: 'user@example.com'
  })
  @IsString()
  @IsNotEmpty({ message: 'Le contact est requis' })
  contact: string;

  @ApiProperty({ 
    description: 'Code OTP a 6 chiffres',
    example: '123456'
  })
  @IsString()
  @IsNotEmpty({ message: 'Le code OTP est requis' })
  @MinLength(6, { message: 'Le code OTP doit avoir 6 caracteres' })
  @MaxLength(6, { message: 'Le code OTP doit avoir 6 caracteres' })
  code: string;
}
