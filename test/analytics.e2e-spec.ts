import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { setupTestContext, TestContext } from './test-utils';

describe('Analytics (e2e)', () => {
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

    ctx = await setupTestContext(app, 'analytics-e2e@test.local');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Dashboard Analytics', () => {
    it('GET /analytics/dashboard should return dashboard data', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/dashboard')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('revenue');
      expect(response.body).toHaveProperty('orders');
      expect(response.body).toHaveProperty('customers');
    });

    it('GET /analytics/overview should return overview stats', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/overview')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('Sales Analytics', () => {
    it('GET /analytics/sales should return sales data', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/sales')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('GET /analytics/sales/daily should return daily sales', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/sales/daily')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('GET /analytics/sales/monthly should return monthly sales', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/sales/monthly')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('GET /analytics/sales with date range should work', async () => {
      const today = new Date();
      const lastMonth = new Date(today);
      lastMonth.setMonth(today.getMonth() - 1);

      const response = await request(app.getHttpServer())
        .get('/analytics/sales')
        .query({
          startDate: lastMonth.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0],
        })
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('Product Analytics', () => {
    it('GET /analytics/products/top should return top products', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/products/top')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('GET /analytics/products/performance should return product performance', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/products/performance')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('GET /analytics/categories should return category analytics', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/categories')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Customer Analytics', () => {
    it('GET /analytics/customers should return customer analytics', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/customers')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('GET /analytics/customers/top should return top customers', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/customers/top')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('GET /analytics/customers/new should return new customers count', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/customers/new')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('count');
    });
  });

  describe('Revenue Analytics', () => {
    it('GET /analytics/revenue should return revenue data', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/revenue')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('total');
    });

    it('GET /analytics/revenue/trend should return revenue trend', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/revenue/trend')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('GET /analytics/profit should return profit data', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/profit')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('Inventory Analytics', () => {
    it('GET /analytics/inventory should return inventory analytics', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/inventory')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('GET /analytics/inventory/turnover should return turnover rate', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/inventory/turnover')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('Export Analytics', () => {
    it('GET /analytics/export should export analytics data', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/export')
        .query({ format: 'json' })
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('Access Control', () => {
    it('GET /analytics/dashboard should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .get('/analytics/dashboard')
        .expect(401);
    });

    it('GET /analytics/sales should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .get('/analytics/sales')
        .expect(401);
    });
  });
});
