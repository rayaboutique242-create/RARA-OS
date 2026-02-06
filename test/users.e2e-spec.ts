import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Users (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let userId: string;
  let tenantId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    // Get auth token
    const sendRes = await request(app.getHttpServer())
      .post('/auth/otp/send')
      .send({ contact: 'user-test@test.local' });

    const verifyRes = await request(app.getHttpServer())
      .post('/auth/otp/verify')
      .send({
        contact: 'user-test@test.local',
        code: sendRes.body.otp || '000000',
      });

    accessToken = verifyRes.body.accessToken;

    // Get current user info
    const meRes = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    userId = meRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('User Management', () => {
    it('GET /users should list all users', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('GET /users/:id should get user by id', async () => {
      if (!userId) {
        console.warn('Skipping GET /users/:id - no userId');
        return;
      }

      const response = await request(app.getHttpServer())
        .get(`/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(userId);
      expect(response.body).toHaveProperty('username');
      expect(response.body).toHaveProperty('email');
    });

    it('POST /users should create a new user', async () => {
      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          username: `testuser${Date.now()}`,
          email: `user${Date.now()}@test.local`,
          password: 'SecurePass123!',
          role: 'user',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.username).toMatch(/testuser/);
    });

    it('PATCH /users/:id should update user', async () => {
      if (!userId) {
        console.warn('Skipping PATCH /users/:id - no userId');
        return;
      }

      const response = await request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          firstName: 'John',
          lastName: 'Doe',
        })
        .expect(200);

      expect(response.body.firstName).toBe('John');
      expect(response.body.lastName).toBe('Doe');
    });

    it('GET /users/current should get current user', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/current')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(userId);
    });

    it('PATCH /users/current should update current user profile', async () => {
      const response = await request(app.getHttpServer())
        .patch('/users/current')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          firstName: 'Updated',
          phone: '+1234567890',
        })
        .expect(200);

      expect(response.body.firstName).toBe('Updated');
    });

    it('POST /users/:id/deactivate should deactivate user', async () => {
      if (!userId) {
        console.warn('Skipping deactivate test - no userId');
        return;
      }

      const newUserRes = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          username: `deactive${Date.now()}`,
          email: `deactive${Date.now()}@test.local`,
          password: 'SecurePass123!',
          role: 'user',
        });

      const deactivateRes = await request(app.getHttpServer())
        .post(`/users/${newUserRes.body.id}/deactivate`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(deactivateRes.body.active).toBe(false);
    });
  });

  describe('User Permissions', () => {
    it('GET /users should be protected', () => {
      return request(app.getHttpServer())
        .get('/users')
        .expect(401);
    });

    it('DELETE /users/:id without proper permissions should fail', async () => {
      if (!userId) {
        console.warn('Skipping permission test - no userId');
        return;
      }

      const response = await request(app.getHttpServer())
        .delete(`/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      // Should either be 403 forbidden or not allowed
      expect([403, 405]).toContain(response.status);
    });
  });

  describe('User Validation', () => {
    it('POST /users with invalid email should fail', () => {
      return request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          username: 'testuser',
          email: 'not-an-email',
          password: 'SecurePass123!',
          role: 'user',
        })
        .expect(400);
    });

    it('POST /users with weak password should fail', () => {
      return request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          username: 'testuser',
          email: 'test@test.local',
          password: 'weak', // Too weak
          role: 'user',
        })
        .expect(400);
    });

    it('POST /users with missing required fields should fail', () => {
      return request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          username: 'testuser',
          // Missing email and password
        })
        .expect(400);
    });

    it('POST /users with duplicate username should fail', async () => {
      const username = `unique${Date.now()}`;

      // Create first user
      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          username,
          email: `email${Date.now()}@test.local`,
          password: 'SecurePass123!',
          role: 'user',
        });

      // Try to create duplicate
      return request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          username, // Same username
          email: `another${Date.now()}@test.local`,
          password: 'SecurePass123!',
          role: 'user',
        })
        .expect(409); // Conflict
    });
  });

  describe('User Role Management', () => {
    it('Should have default role when created', async () => {
      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          username: `roletest${Date.now()}`,
          email: `roletest${Date.now()}@test.local`,
          password: 'SecurePass123!',
          // No role specified
        })
        .expect(201);

      expect(response.body).toHaveProperty('role');
      expect(['user', 'pdg', 'manager']).toContain(response.body.role);
    });

    it('Should only allow valid roles', () => {
      return request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          username: `invalidrole${Date.now()}`,
          email: `invalidrole${Date.now()}@test.local`,
          password: 'SecurePass123!',
          role: 'invalid_role', // Invalid role
        })
        .expect(400);
    });
  });
});
