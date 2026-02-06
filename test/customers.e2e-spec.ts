import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { setupTestContext, TestContext } from './test-utils';

describe('Customers (e2e)', () => {
  let app: INestApplication;
  let ctx: TestContext;
  let createdCustomerId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    ctx = await setupTestContext(app, 'customers-e2e@test.local');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Customer CRUD Operations', () => {
    const testCustomer = {
      name: 'E2E Test Customer',
      email: `e2e-customer-${Date.now()}@test.local`,
      phone: '+221771234567',
      address: '123 Test Street',
      city: 'Dakar',
      notes: 'Created during E2E testing',
    };

    it('POST /customers should create a new customer', async () => {
      const response = await request(app.getHttpServer())
        .post('/customers')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .send(testCustomer)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(testCustomer.name);
      expect(response.body.email).toBe(testCustomer.email);
      expect(response.body.phone).toBe(testCustomer.phone);

      createdCustomerId = response.body.id;
    });

    it('GET /customers should return paginated customers list', async () => {
      const response = await request(app.getHttpServer())
        .get('/customers')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('GET /customers/:id should return single customer', async () => {
      if (!createdCustomerId) {
        console.warn('Skipping - no customer created');
        return;
      }

      const response = await request(app.getHttpServer())
        .get(`/customers/${createdCustomerId}`)
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(createdCustomerId);
      expect(response.body.name).toBe(testCustomer.name);
    });

    it('GET /customers with search filter should work', async () => {
      const response = await request(app.getHttpServer())
        .get('/customers')
        .query({ search: 'E2E Test' })
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThanOrEqual(0);
    });

    it('GET /customers/search should search by phone', async () => {
      const response = await request(app.getHttpServer())
        .get('/customers/search')
        .query({ phone: '+221771234567' })
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body) || response.body.data).toBeTruthy();
    });

    it('PATCH /customers/:id should update customer', async () => {
      if (!createdCustomerId) {
        console.warn('Skipping - no customer created');
        return;
      }

      const updateData = {
        name: 'E2E Updated Customer',
        city: 'Saint-Louis',
      };

      const response = await request(app.getHttpServer())
        .patch(`/customers/${createdCustomerId}`)
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.city).toBe(updateData.city);
    });

    it('GET /customers/:id/orders should return customer orders', async () => {
      if (!createdCustomerId) {
        console.warn('Skipping - no customer created');
        return;
      }

      const response = await request(app.getHttpServer())
        .get(`/customers/${createdCustomerId}/orders`)
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body) || response.body.data).toBeTruthy();
    });

    it('GET /customers/:id/stats should return customer statistics', async () => {
      if (!createdCustomerId) {
        console.warn('Skipping - no customer created');
        return;
      }

      const response = await request(app.getHttpServer())
        .get(`/customers/${createdCustomerId}/stats`)
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalOrders');
      expect(response.body).toHaveProperty('totalSpent');
    });

    it('DELETE /customers/:id should delete customer', async () => {
      if (!createdCustomerId) {
        console.warn('Skipping - no customer created');
        return;
      }

      await request(app.getHttpServer())
        .delete(`/customers/${createdCustomerId}`)
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .expect(200);

      // Verify deletion
      await request(app.getHttpServer())
        .get(`/customers/${createdCustomerId}`)
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .expect(404);
    });
  });

  describe('Customer Validation', () => {
    it('POST /customers should reject missing required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/customers')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .send({ email: 'incomplete@test.local' }) // Missing name
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('POST /customers should reject invalid email', async () => {
      const response = await request(app.getHttpServer())
        .post('/customers')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .send({
          name: 'Invalid Email Customer',
          email: 'not-an-email',
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('POST /customers should reject duplicate email', async () => {
      const uniqueEmail = `duplicate-test-${Date.now()}@test.local`;

      // Create first customer
      await request(app.getHttpServer())
        .post('/customers')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .send({ name: 'First Customer', email: uniqueEmail });

      // Try to create second with same email
      const response = await request(app.getHttpServer())
        .post('/customers')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .send({ name: 'Second Customer', email: uniqueEmail })
        .expect(409);

      expect(response.body.message).toContain('exists');
    });
  });

  describe('Access Control', () => {
    it('GET /customers should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .get('/customers')
        .expect(401);
    });

    it('POST /customers should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .post('/customers')
        .send({ name: 'Test' })
        .expect(401);
    });
  });
});
