// src/auth/guards/github-auth.guard.ts
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GithubAuthGuard extends AuthGuard('github') {
  constructor(private configService: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const clientId = this.configService.get<string>('GITHUB_CLIENT_ID');
    if (!clientId || clientId === 'not-configured') {
      const res = context.switchToHttp().getResponse();
      res.status(501).json({
        statusCode: 501,
        message: 'GitHub OAuth non configuré. Définissez GITHUB_CLIENT_ID et GITHUB_CLIENT_SECRET.',
      });
      return false;
    }
    return super.canActivate(context);
  }
}
