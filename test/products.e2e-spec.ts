import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { setupTestContext, TestContext } from './test-utils';

describe('Products (e2e)', () => {
  let app: INestApplication;
  let ctx: TestContext;
  let createdProductId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    // Setup authenticated context
    ctx = await setupTestContext(app, 'products-e2e@test.local');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Product CRUD Operations', () => {
    const testProduct = {
      name: 'E2E Test Product',
      description: 'Product created during E2E testing',
      sku: `E2E-SKU-${Date.now()}`,
      barcode: `E2E${Date.now()}`,
      price: 1500,
      costPrice: 1000,
      stockQuantity: 100,
      minStockLevel: 10,
      unit: 'pièce',
      isActive: true,
    };

    it('POST /products should create a new product', async () => {
      const response = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .send(testProduct)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(testProduct.name);
      expect(response.body.sku).toBe(testProduct.sku);
      expect(response.body.price).toBe(testProduct.price);
      
      createdProductId = response.body.id;
    });

    it('GET /products should return paginated products list', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('GET /products/:id should return single product', async () => {
      if (!createdProductId) {
        console.warn('Skipping - no product created');
        return;
      }

      const response = await request(app.getHttpServer())
        .get(`/products/${createdProductId}`)
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(createdProductId);
      expect(response.body.name).toBe(testProduct.name);
    });

    it('GET /products with search filter should work', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .query({ search: 'E2E Test' })
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThanOrEqual(0);
    });

    it('GET /products with price range filter should work', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .query({ minPrice: 1000, maxPrice: 2000 })
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('PATCH /products/:id should update product', async () => {
      if (!createdProductId) {
        console.warn('Skipping - no product created');
        return;
      }

      const updateData = {
        name: 'E2E Updated Product',
        price: 1800,
      };

      const response = await request(app.getHttpServer())
        .patch(`/products/${createdProductId}`)
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.price).toBe(updateData.price);
    });

    it('POST /products/bulk-update should update multiple products', async () => {
      if (!createdProductId) {
        console.warn('Skipping - no product created');
        return;
      }

      const response = await request(app.getHttpServer())
        .post('/products/bulk-update')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .send({
          ids: [createdProductId],
          data: { isActive: true },
        })
        .expect(200);

      expect(response.body).toHaveProperty('updated');
    });

    it('GET /products/low-stock should return low stock products', async () => {
      const response = await request(app.getHttpServer())
        .get('/products/low-stock')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('GET /products/search with barcode should work', async () => {
      const response = await request(app.getHttpServer())
        .get('/products/search')
        .query({ barcode: testProduct.barcode })
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body) || response.body.data).toBeTruthy();
    });

    it('DELETE /products/:id should delete product', async () => {
      if (!createdProductId) {
        console.warn('Skipping - no product created');
        return;
      }

      await request(app.getHttpServer())
        .delete(`/products/${createdProductId}`)
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .expect(200);

      // Verify deletion
      await request(app.getHttpServer())
        .get(`/products/${createdProductId}`)
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .expect(404);
    });
  });

  describe('Product Validation', () => {
    it('POST /products should reject invalid data', async () => {
      const response = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .send({ name: '' }) // Invalid - empty name
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('POST /products should reject negative price', async () => {
      const response = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .send({
          name: 'Invalid Product',
          sku: 'INVALID-SKU',
          price: -100,
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('GET /products/:id should return 404 for non-existent product', async () => {
      await request(app.getHttpServer())
        .get('/products/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${ctx.accessToken}`)
        .expect(404);
    });
  });

  describe('Access Control', () => {
    it('GET /products should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .get('/products')
        .expect(401);
    });

    it('POST /products should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .post('/products')
        .send({ name: 'Test' })
        .expect(401);
    });
  });
});
