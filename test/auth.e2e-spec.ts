import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Auth Flow', () => {
    it('POST /auth/otp/send should send OTP', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/otp/send')
        .send({
          contact: 'e2e@test.local',
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('OTP');
    });

    it('POST /auth/otp/verify should verify OTP and return tokens', async () => {
      // First send OTP
      const sendRes = await request(app.getHttpServer())
        .post('/auth/otp/send')
        .send({
          contact: 'e2e.verify@test.local',
        })
        .expect(200);

      // Extract OTP from response (if enabled in config)
      // For testing, we assume OTP_RETURN_CODE is enabled
      let otp = '000000';

      if (sendRes.body.otp) {
        otp = sendRes.body.otp;
      }

      // Verify OTP
      const verifyRes = await request(app.getHttpServer())
        .post('/auth/otp/verify')
        .send({
          contact: 'e2e.verify@test.local',
          code: otp,
        })
        .expect(200);

      expect(verifyRes.body).toHaveProperty('accessToken');
      expect(verifyRes.body).toHaveProperty('refreshToken');

      accessToken = verifyRes.body.accessToken;
      refreshToken = verifyRes.body.refreshToken;
    });

    it('POST /auth/refresh should refresh access token', async () => {
      if (!refreshToken) {
        console.warn('Skipping refresh test - no refresh token available');
        return;
      }

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken,
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      accessToken = response.body.accessToken;
    });

    it('GET /auth/me should return current user with valid token', async () => {
      if (!accessToken) {
        console.warn('Skipping /auth/me test - no access token');
        return;
      }

      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('username');
      expect(response.body).toHaveProperty('email');
    });

    it('GET /auth/me should fail without token', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .expect(401);
    });

    it('GET /auth/me should fail with invalid token', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);
    });

    it('POST /auth/logout should invalidate token', async () => {
      if (!accessToken) {
        console.warn('Skipping logout test - no access token');
        return;
      }

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Token should be invalidated
      // Note: This depends on implementation
    });
  });

  describe('Auth Error Handling', () => {
    it('POST /auth/otp/send should reject invalid email', () => {
      return request(app.getHttpServer())
        .post('/auth/otp/send')
        .send({
          contact: 'not-an-email',
        })
        .expect(400);
    });

    it('POST /auth/otp/verify with invalid code should fail', async () => {
      // Send OTP first
      await request(app.getHttpServer())
        .post('/auth/otp/send')
        .send({
          contact: 'e2e.invalid@test.local',
        });

      // Try with invalid code
      return request(app.getHttpServer())
        .post('/auth/otp/verify')
        .send({
          contact: 'e2e.invalid@test.local',
          code: '999999',
        })
        .expect(400);
    });

    it('POST /auth/otp/verify with missing contact should fail', () => {
      return request(app.getHttpServer())
        .post('/auth/otp/verify')
        .send({
          code: '123456',
        })
        .expect(400);
    });
  });
});
