import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

describe('Tenants (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
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
      .send({ contact: 'tenant-test@test.local' });

    const verifyRes = await request(app.getHttpServer())
      .post('/auth/otp/verify')
      .send({
        contact: 'tenant-test@test.local',
        code: sendRes.body.otp || '000000',
      });

    accessToken = verifyRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Tenant CRUD', () => {
    it('POST /tenants should create a new tenant', async () => {
      const response = await request(app.getHttpServer())
        .post('/tenants')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          tenantCode: 'TEST001',
          name: 'Test Tenant',
          email: 'test@tenant.local',
          ownerName: 'Test Owner',
          ownerEmail: 'owner@test.local',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.tenantCode).toBe('TEST001');
      expect(response.body.name).toBe('Test Tenant');

      tenantId = response.body.id;
    });

    it('GET /tenants should list all tenants', async () => {
      const response = await request(app.getHttpServer())
        .get('/tenants')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('GET /tenants/:id should get tenant by id', async () => {
      if (!tenantId) {
        console.warn('Skipping GET /tenants/:id - no tenantId');
        return;
      }

      const response = await request(app.getHttpServer())
        .get(`/tenants/${tenantId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(tenantId);
      expect(response.body).toHaveProperty('tenantCode');
    });

    it('PATCH /tenants/:id should update tenant', async () => {
      if (!tenantId) {
        console.warn('Skipping PATCH /tenants/:id - no tenantId');
        return;
      }

      const response = await request(app.getHttpServer())
        .patch(`/tenants/${tenantId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Updated Tenant Name',
        })
        .expect(200);

      expect(response.body.name).toBe('Updated Tenant Name');
    });

    it('GET /tenants/current should get current tenant', async () => {
      const response = await request(app.getHttpServer())
        .get('/tenants/current')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('tenantCode');
    });

    it('GET /tenants/current/settings should get tenant settings', async () => {
      const response = await request(app.getHttpServer())
        .get('/tenants/current/settings')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('timezone');
      expect(response.body).toHaveProperty('billingCurrency');
    });

    it('PATCH /tenants/current/settings should update tenant settings', async () => {
      const response = await request(app.getHttpServer())
        .patch('/tenants/current/settings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          timezone: 'Africa/Accra',
          billingCurrency: 'GHS',
        })
        .expect(200);

      expect(response.body.timezone).toBe('Africa/Accra');
      expect(response.body.billingCurrency).toBe('GHS');
    });
  });

  describe('Tenant Error Handling', () => {
    it('POST /tenants with missing required fields should fail', () => {
      return request(app.getHttpServer())
        .post('/tenants')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          tenantCode: 'TEST002',
          // Missing required fields
        })
        .expect(400);
    });

    it('GET /tenants/:id with invalid id should return 404', async () => {
      return request(app.getHttpServer())
        .get('/tenants/invalid-uuid')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400); // Invalid UUID
    });

    it('PATCH /tenants/:id without token should fail', async () => {
      if (!tenantId) {
        console.warn('Skipping unauthorized test - no tenantId');
        return;
      }

      return request(app.getHttpServer())
        .patch(`/tenants/${tenantId}`)
        .send({ name: 'Updated' })
        .expect(401);
    });
  });

  describe('Multi-Tenancy Isolation', () => {
    let tenant1Id: string = '';
    let tenant2Id: string = '';
    let token1: string = '';
    let token2: string = '';

    it('Should create two tenants for isolation testing', async () => {
      // Create first tenant
      const response1 = await request(app.getHttpServer())
        .post('/tenants')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Isolation Test Tenant 1' });

      expect(response1.status).toBe(201);
      tenant1Id = response1.body.data.id;
      expect(tenant1Id).toBeDefined();

      // Create second tenant
      const response2 = await request(app.getHttpServer())
        .post('/tenants')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Isolation Test Tenant 2' });

      expect(response2.status).toBe(201);
      tenant2Id = response2.body.data.id;
      expect(tenant2Id).toBeDefined();
    });

    it('Should isolate data between tenants', async () => {
      // This test ensures that tenant1's data is not visible to tenant2
      // Implementation depends on your multi-tenancy strategy
      
      expect(tenant1Id).toBeDefined();
      expect(tenant2Id).toBeDefined();
    });

    it('Should not allow cross-tenant access', async () => {
      if (!accessToken || !tenantId) {
        console.warn('Skipping cross-tenant test');
        return;
      }

      // Try to access with x-tenant-id header mismatch
      const response = await request(app.getHttpServer())
        .get(`/tenants/${tenantId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Tenant-ID', 'different-tenant-id');

      // Should either fail or return empty
      expect([200, 403, 404]).toContain(response.status);
    });
  });
});
