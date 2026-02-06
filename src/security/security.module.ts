// src/security/security.module.ts
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { TwoFactorAuthService } from './services/two-factor-auth.service';
import { TwoFactorAuthController } from './controllers/two-factor-auth.controller';
import { SecurityController } from './controllers/security.controller';
import { SecurityService } from './services/security.service';
import { PasswordService } from './services/password.service';
import { BruteForceGuard } from './guards/brute-force.guard';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoginAttempt } from './entities/login-attempt.entity';
import { SecurityConfig } from './entities/security-config.entity';
import { UserTwoFactor } from './entities/user-two-factor.entity';
import { BlockedIp } from './entities/blocked-ip.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LoginAttempt,
      SecurityConfig,
      UserTwoFactor,
      BlockedIp,
    ]),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 seconde
        limit: 3, // 3 requêtes par seconde
      },
      {
        name: 'medium',
        ttl: 10000, // 10 secondes
        limit: 20, // 20 requêtes par 10 secondes
      },
      {
        name: 'long',
        ttl: 60000, // 1 minute
        limit: 100, // 100 requêtes par minute
      },
    ]),
    UsersModule,
  ],
  controllers: [TwoFactorAuthController, SecurityController],
  providers: [
    TwoFactorAuthService,
    SecurityService,
    PasswordService,
    BruteForceGuard,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [
    TwoFactorAuthService,
    SecurityService,
    PasswordService,
    BruteForceGuard,
    ThrottlerModule,
  ],
})
export class SecurityModule {}
