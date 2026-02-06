// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { OtpService } from './otp.service';
import { EmailService } from './services/email.service';
import { SessionService } from './services/session.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { GithubStrategy } from './strategies/github.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Session } from './entities/session.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    UsersModule,
    TypeOrmModule.forFeature([Session]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret || secret.includes('change_in_production')) {
          const env = configService.get<string>('NODE_ENV', 'development');
          if (env === 'production') {
            throw new Error('JWT_SECRET must be set to a strong value in production!');
          }
        }
        return {
          secret: secret || 'dev-only-secret-do-not-use-in-prod',
          signOptions: {
            expiresIn: configService.get<number>('JWT_EXPIRES_IN', 3600) as any,
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    OtpService,
    EmailService,
    SessionService,
    JwtStrategy,
    GoogleStrategy,
    GithubStrategy,
    // Global guards — JwtAuthGuard first, then RolesGuard (applied to ALL routes)
    // Use @Public() to opt-out from JwtAuthGuard
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [AuthService, OtpService, EmailService, SessionService, JwtModule],
})
export class AuthModule {}
