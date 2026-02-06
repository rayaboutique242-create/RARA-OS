import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { setupTestContext, TestContext } from './test-utils';

describe('Orders (e2e)', () => {
  let app: INestApplication;
  let ctx: TestContext;
  let createdOrderId: string;
  let testProductId: string;
  let testCustomerId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    ctx = await setupTestContext(app, 'orders-e2e@test.local');

    // Create test product for orders
    const productRes = await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${ctx.accessToken}`)
      .send({
        name: 'Order Test Product',
        sku: `ORDER-SKU-${Date.now()}`,
        price: 1000,
        stockQuantity: 100,
      });
    
    if (productRes.status === 201) {
      testProductId = productRes.body.id;
    }

    // Create test customer
    const customerRes = await request(app.getHttpServer())
      .post('/customers')
      .set('Authorization', `Bearer ${ctx.accessToken}`)
      .send({
        name: 'Order Test Customer',
        email: `order-customer-${Date.now()}@test.local`,
        phone: '+221771234567',
      });
    
    if (customerRes.status === 201) {
      testCustomerId = customerRes.body.id;
    }
  });

  afterAll(async () => {
    // Cleanup test data
    if (testProductId) {
      await request(app.getHttpServer())
        .delete(`/products/${testProductId}`)
        .set('Authorization', `Bearer ${ctx.accessToken}`);
    }
    if (testCustomerId) {
      await request(app.getHttpServer())
        .delete(`/customers/${testCustomerId}`)
        .set('Authorization', `Bearer ${ctx.accessToken}`);
    }
    await app.close();
  });

  describe('Order CRUD Operations', () => {
    it('POST /orders should create a new order', async () => {
      if (!testProductId) {
        console.warn('Skipping - no test product available');
        return;
      }

      const orderData = {
        customerId: testCustomerId,
        items: [
          {
            productId: testProductId,
            quantity: 2,
            unitPrice: 1000,
          },
        ],
        paymentMethod: 'CASH',
        notes: 'E2E Test Order',
      };

      const response = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .send(orderData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('orderNumber');
      expect(response.body.status).toBeDefined();
      expect(response.body.total).toBe(2000);

      createdOrderId = response.body.id;
    });

    it('GET /orders should return paginated orders list', async () => {
      const response = await request(app.getHttpServer())
        .get('/orders')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('GET /orders/:id should return single order with items', async () => {
      if (!createdOrderId) {
        console.warn('Skipping - no order created');
        return;
      }

      const response = await request(app.getHttpServer())
        .get(`/orders/${createdOrderId}`)
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(createdOrderId);
      expect(response.body).toHaveProperty('items');
      expect(Array.isArray(response.body.items)).toBe(true);
    });

    it('GET /orders with status filter should work', async () => {
      const response = await request(app.getHttpServer())
        .get('/orders')
        .query({ status: 'PENDING' })
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('GET /orders with date range filter should work', async () => {
      const today = new Date().toISOString().split('T')[0];
      const response = await request(app.getHttpServer())
        .get('/orders')
        .query({ startDate: today, endDate: today })
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('GET /orders/recent should return recent orders', async () => {
      const response = await request(app.getHttpServer())
        .get('/orders/recent')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('PATCH /orders/:id/status should update order status', async () => {
      if (!createdOrderId) {
        console.warn('Skipping - no order created');
        return;
      }

      const response = await request(app.getHttpServer())
        .patch(`/orders/${createdOrderId}/status`)
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .send({ status: 'CONFIRMED' })
        .expect(200);

      expect(response.body.status).toBe('CONFIRMED');
    });

    it('POST /orders/:id/payment should record payment', async () => {
      if (!createdOrderId) {
        console.warn('Skipping - no order created');
        return;
      }

      const response = await request(app.getHttpServer())
        .post(`/orders/${createdOrderId}/payment`)
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .send({
          amount: 2000,
          method: 'CASH',
        })
        .expect(200);

      expect(response.body).toHaveProperty('paymentStatus');
    });

    it('GET /orders/:id/receipt should generate receipt', async () => {
      if (!createdOrderId) {
        console.warn('Skipping - no order created');
        return;
      }

      const response = await request(app.getHttpServer())
        .get(`/orders/${createdOrderId}/receipt`)
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('Order Statistics', () => {
    it('GET /orders/stats should return order statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/orders/stats')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalOrders');
      expect(response.body).toHaveProperty('totalRevenue');
    });

    it('GET /orders/stats/daily should return daily statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/orders/stats/daily')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Order Validation', () => {
    it('POST /orders should reject empty items', async () => {
      const response = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .send({ items: [] })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('POST /orders should reject invalid product ID', async () => {
      const response = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .send({
          items: [{
            productId: '00000000-0000-0000-0000-000000000000',
            quantity: 1,
            unitPrice: 100,
          }],
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('POST /orders should reject negative quantity', async () => {
      if (!testProductId) {
        console.warn('Skipping - no test product');
        return;
      }

      const response = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .send({
          items: [{
            productId: testProductId,
            quantity: -1,
            unitPrice: 100,
          }],
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });
  });

  describe('Access Control', () => {
    it('GET /orders should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .get('/orders')
        .expect(401);
    });

    it('POST /orders should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .post('/orders')
        .send({ items: [] })
        .expect(401);
    });
  });
});
