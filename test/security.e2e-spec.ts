import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { setupTestContext, TestContext } from './test-utils';

describe('Security (e2e)', () => {
  let app: INestApplication;
  let ctx: TestContext;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    ctx = await setupTestContext(app, 'security-e2e@test.local');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Two-Factor Authentication', () => {
    let setupData: { secret: string; qrCode: string; recoveryCodes: string[] };

    it('GET /security/2fa/status should return 2FA status', async () => {
      const response = await request(app.getHttpServer())
        .get('/security/2fa/status')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('isEnabled');
      expect(typeof response.body.isEnabled).toBe('boolean');
    });

    it('POST /security/2fa/setup should initiate 2FA setup', async () => {
      const response = await request(app.getHttpServer())
        .post('/security/2fa/setup')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .send({ method: 'TOTP' })
        .expect(201);

      expect(response.body).toHaveProperty('secret');
      expect(response.body).toHaveProperty('qrCode');
      expect(response.body).toHaveProperty('recoveryCodes');
      expect(response.body.qrCode).toContain('data:image/png;base64');
      expect(Array.isArray(response.body.recoveryCodes)).toBe(true);
      expect(response.body.recoveryCodes.length).toBe(10);

      setupData = response.body;
    });

    it('POST /security/2fa/verify should reject invalid code', async () => {
      const response = await request(app.getHttpServer())
        .post('/security/2fa/verify')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .send({ code: '000000' })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('POST /security/2fa/validate should reject without 2FA enabled', async () => {
      const response = await request(app.getHttpServer())
        .post('/security/2fa/validate')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .send({ code: '123456' })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('DELETE /security/2fa/disable should require valid code', async () => {
      const response = await request(app.getHttpServer())
        .delete('/security/2fa/disable')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .send({ code: '000000' })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('POST /security/2fa/recovery/use should reject invalid recovery code', async () => {
      const response = await request(app.getHttpServer())
        .post('/security/2fa/recovery/use')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .send({ code: 'INVALID-CODE' })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });
  });

  describe('Password Security', () => {
    it('POST /auth/change-password should require current password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .send({
          currentPassword: 'wrong-password',
          newPassword: 'NewSecureP@ss123',
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('POST /auth/change-password should reject weak password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .send({
          currentPassword: 'currentPassword',
          newPassword: '123', // Too weak
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });
  });

  describe('Session Management', () => {
    it('GET /security/sessions should return active sessions', async () => {
      const response = await request(app.getHttpServer())
        .get('/security/sessions')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('DELETE /security/sessions/:id should revoke session', async () => {
      // Get sessions first
      const sessionsRes = await request(app.getHttpServer())
        .get('/security/sessions')
        .set('Authorization', `Bearer ${ctx.accessToken}`);

      if (sessionsRes.body.length > 1) {
        const sessionToRevoke = sessionsRes.body[1]; // Not current session
        await request(app.getHttpServer())
          .delete(`/security/sessions/${sessionToRevoke.id}`)
          .set('Authorization', `Bearer ${ctx.accessToken}`)
          .expect(200);
      }
    });

    it('POST /security/sessions/revoke-all should revoke all other sessions', async () => {
      const response = await request(app.getHttpServer())
        .post('/security/sessions/revoke-all')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('revoked');
    });
  });

  describe('Audit Logging', () => {
    it('GET /audit should return audit logs', async () => {
      const response = await request(app.getHttpServer())
        .get('/audit')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body) || response.body.data).toBeTruthy();
    });

    it('GET /audit with action filter should work', async () => {
      const response = await request(app.getHttpServer())
        .get('/audit')
        .query({ action: 'LOGIN' })
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body) || response.body.data).toBeTruthy();
    });
  });

  describe('Rate Limiting', () => {
    it('Should handle multiple requests without rate limit errors', async () => {
      // Make several requests in sequence
      for (let i = 0; i < 5; i++) {
        const response = await request(app.getHttpServer())
          .get('/security/2fa/status')
          .set('Authorization', `Bearer ${ctx.accessToken}`);
        
        expect(response.status).not.toBe(429);
      }
    });
  });

  describe('Access Control', () => {
    it('GET /security/2fa/status should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .get('/security/2fa/status')
        .expect(401);
    });

    it('POST /security/2fa/setup should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .post('/security/2fa/setup')
        .send({ method: 'TOTP' })
        .expect(401);
    });

    it('GET /audit should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .get('/audit')
        .expect(401);
    });
  });
});
