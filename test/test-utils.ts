/**
 * Test Configuration & Utilities
 * Shared utilities for E2E tests
 */

import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';

export interface TestContext {
  app: INestApplication;
  accessToken?: string;
  refreshToken?: string;
  userId?: string;
  tenantId?: string;
}

/**
 * Setup application for testing
 */
export async function setupTestApp(app: INestApplication): Promise<void> {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();
}

/**
 * Setup test context with authentication
 */
export async function setupTestContext(
  app: INestApplication,
  email: string,
): Promise<TestContext> {
  const context: TestContext = { app };

  try {
    // Send OTP
    const sendRes = await request(app.getHttpServer())
      .post('/auth/otp/send')
      .send({ contact: email });

    if (sendRes.status !== 200) {
      throw new Error('Failed to send OTP');
    }

    // Verify OTP
    const otp = sendRes.body.otp || '000000';
    const verifyRes = await request(app.getHttpServer())
      .post('/auth/otp/verify')
      .send({ contact: email, code: otp });

    if (verifyRes.status !== 200) {
      throw new Error('Failed to verify OTP');
    }

    context.accessToken = verifyRes.body.accessToken;
    context.refreshToken = verifyRes.body.refreshToken;

    // Get current user info
    const meRes = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${context.accessToken}`);

    if (meRes.status === 200) {
      context.userId = meRes.body.id;
      context.tenantId = meRes.body.tenantId;
    }

    return context;
  } catch (error) {
    console.error('Failed to setup test context:', error.message);
    throw error;
  }
}

/**
 * Make authenticated request
 */
export async function authenticatedRequest(
  app: INestApplication,
  method: string,
  path: string,
  token: string,
  body?: any,
) {
  let req = request(app.getHttpServer())[method.toLowerCase()](path);

  if (token) {
    req = req.set('Authorization', `Bearer ${token}`);
  }

  if (body) {
    req = req.send(body);
  }

  return req;
}

/**
 * Assert response structure
 */
export function assertResponseStructure(response: any, expectedFields: string[]) {
  for (const field of expectedFields) {
    expect(response).toHaveProperty(field);
  }
}

/**
 * Assert error response
 */
export function assertErrorResponse(
  response: any,
  expectedStatus: number,
  expectedMessage?: string,
) {
  expect(response.status).toBe(expectedStatus);

  if (expectedMessage) {
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain(expectedMessage);
  }
}

/**
 * Retry logic for flaky tests
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 100,
): Promise<T> {
  let lastError: Error = new Error('Max retries exceeded without success');

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}

/**
 * Generate unique email for testing
 */
export function generateTestEmail(prefix: string = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}@test.local`;
}

/**
 * Generate unique username for testing
 */
export function generateTestUsername(prefix: string = 'user'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

/**
 * Clean test data (optional)
 */
export async function cleanupTestData(app: INestApplication, token: string): Promise<void> {
  // Implement cleanup logic as needed
  // This could delete test users, tenants, etc.
}
