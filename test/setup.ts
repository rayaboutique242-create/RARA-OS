// test/setup.ts
// Global test setup and configuration

// Increase timeout for E2E tests
jest.setTimeout(30000);

// Mock environment variables if needed
process.env.NODE_ENV = 'test';
process.env.DB_LOGGING = 'false';

// Suppress unnecessary logs during tests
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  // Optionally suppress logs during tests
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Global error handler for unhandled rejections
process.on('unhandledRejection', (reason: Error) => {
  console.error('Unhandled Rejection in E2E Test:', reason);
});

