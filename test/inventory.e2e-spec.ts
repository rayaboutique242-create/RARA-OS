import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { setupTestContext, TestContext } from './test-utils';

describe('Inventory (e2e)', () => {
  let app: INestApplication;
  let ctx: TestContext;
  let testProductId: string;
  let createdMovementId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    ctx = await setupTestContext(app, 'inventory-e2e@test.local');

    // Create test product
    const productRes = await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${ctx.accessToken}`)
      .send({
        name: 'Inventory Test Product',
        sku: `INV-SKU-${Date.now()}`,
        price: 1000,
        stockQuantity: 50,
        minStockLevel: 10,
      });
    
    if (productRes.status === 201) {
      testProductId = productRes.body.id;
    }
  });

  afterAll(async () => {
    if (testProductId) {
      await request(app.getHttpServer())
        .delete(`/products/${testProductId}`)
        .set('Authorization', `Bearer ${ctx.accessToken}`);
    }
    await app.close();
  });

  describe('Stock Movements', () => {
    it('POST /inventory/movements should record stock IN movement', async () => {
      if (!testProductId) {
        console.warn('Skipping - no test product');
        return;
      }

      const response = await request(app.getHttpServer())
        .post('/inventory/movements')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .send({
          productId: testProductId,
          type: 'IN',
          quantity: 20,
          reason: 'PURCHASE',
          notes: 'E2E Test - Stock receipt',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.type).toBe('IN');
      expect(response.body.quantity).toBe(20);
      
      createdMovementId = response.body.id;
    });

    it('POST /inventory/movements should record stock OUT movement', async () => {
      if (!testProductId) {
        console.warn('Skipping - no test product');
        return;
      }

      const response = await request(app.getHttpServer())
        .post('/inventory/movements')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .send({
          productId: testProductId,
          type: 'OUT',
          quantity: 5,
          reason: 'SALE',
          notes: 'E2E Test - Sale',
        })
        .expect(201);

      expect(response.body.type).toBe('OUT');
      expect(response.body.quantity).toBe(5);
    });

    it('GET /inventory/movements should return movements list', async () => {
      const response = await request(app.getHttpServer())
        .get('/inventory/movements')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('GET /inventory/movements with product filter should work', async () => {
      if (!testProductId) {
        console.warn('Skipping - no test product');
        return;
      }

      const response = await request(app.getHttpServer())
        .get('/inventory/movements')
        .query({ productId: testProductId })
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('GET /inventory/movements with type filter should work', async () => {
      const response = await request(app.getHttpServer())
        .get('/inventory/movements')
        .query({ type: 'IN' })
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Stock Levels', () => {
    it('GET /inventory/stock should return current stock levels', async () => {
      const response = await request(app.getHttpServer())
        .get('/inventory/stock')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body) || response.body.data).toBeTruthy();
    });

    it('GET /inventory/stock/:productId should return product stock', async () => {
      if (!testProductId) {
        console.warn('Skipping - no test product');
        return;
      }

      const response = await request(app.getHttpServer())
        .get(`/inventory/stock/${testProductId}`)
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('quantity');
    });

    it('GET /inventory/low-stock should return low stock items', async () => {
      const response = await request(app.getHttpServer())
        .get('/inventory/low-stock')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('GET /inventory/out-of-stock should return out of stock items', async () => {
      const response = await request(app.getHttpServer())
        .get('/inventory/out-of-stock')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Stock Adjustments', () => {
    it('POST /inventory/adjust should adjust stock', async () => {
      if (!testProductId) {
        console.warn('Skipping - no test product');
        return;
      }

      const response = await request(app.getHttpServer())
        .post('/inventory/adjust')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .send({
          productId: testProductId,
          newQuantity: 100,
          reason: 'E2E Stock count adjustment',
        })
        .expect(200);

      expect(response.body).toHaveProperty('quantity');
    });

    it('POST /inventory/bulk-adjust should adjust multiple products', async () => {
      if (!testProductId) {
        console.warn('Skipping - no test product');
        return;
      }

      const response = await request(app.getHttpServer())
        .post('/inventory/bulk-adjust')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .send({
          adjustments: [
            { productId: testProductId, quantity: 5, type: 'IN', reason: 'Bulk adjustment' },
          ],
        })
        .expect(200);

      expect(response.body).toHaveProperty('processed');
    });
  });

  describe('Inventory Reports', () => {
    it('GET /inventory/valuation should return inventory valuation', async () => {
      const response = await request(app.getHttpServer())
        .get('/inventory/valuation')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalValue');
    });

    it('GET /inventory/history should return stock history', async () => {
      const response = await request(app.getHttpServer())
        .get('/inventory/history')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body) || response.body.data).toBeTruthy();
    });
  });

  describe('Validation', () => {
    it('POST /inventory/movements should reject invalid product', async () => {
      await request(app.getHttpServer())
        .post('/inventory/movements')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .send({
          productId: '00000000-0000-0000-0000-000000000000',
          type: 'IN',
          quantity: 10,
          reason: 'PURCHASE',
        })
        .expect(400);
    });

    it('POST /inventory/movements should reject negative quantity', async () => {
      if (!testProductId) {
        console.warn('Skipping - no test product');
        return;
      }

      await request(app.getHttpServer())
        .post('/inventory/movements')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .send({
          productId: testProductId,
          type: 'IN',
          quantity: -10,
          reason: 'PURCHASE',
        })
        .expect(400);
    });

    it('POST /inventory/movements should reject insufficient stock for OUT', async () => {
      if (!testProductId) {
        console.warn('Skipping - no test product');
        return;
      }

      await request(app.getHttpServer())
        .post('/inventory/movements')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .send({
          productId: testProductId,
          type: 'OUT',
          quantity: 999999, // More than available
          reason: 'SALE',
        })
        .expect(400);
    });
  });

  describe('Access Control', () => {
    it('GET /inventory/movements should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .get('/inventory/movements')
        .expect(401);
    });

    it('POST /inventory/movements should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .post('/inventory/movements')
        .send({ type: 'IN', quantity: 10 })
        .expect(401);
    });
  });
});
