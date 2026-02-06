// src/auth/strategies/github.strategy.ts
import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-github2';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  private readonly logger = new Logger(GithubStrategy.name);

  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get<string>('GITHUB_CLIENT_ID', 'not-configured'),
      clientSecret: configService.get<string>('GITHUB_CLIENT_SECRET', 'not-configured'),
      callbackURL: configService.get<string>(
        'GITHUB_CALLBACK_URL',
        'http://localhost:3000/api/auth/github/callback',
      ),
      scope: ['user:email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (err: any, user?: any) => void,
  ): Promise<void> {
    const { id, username, emails, photos } = profile;

    const user = {
      provider: 'github',
      providerId: id,
      email: emails?.[0]?.value,
      username: username,
      firstName: profile.displayName?.split(' ')[0],
      lastName: profile.displayName?.split(' ').slice(1).join(' '),
      avatarUrl: photos?.[0]?.value,
    };

    this.logger.log(`GitHub OAuth: ${user.email || user.username} (${user.providerId})`);
    done(null, user);
  }
}
