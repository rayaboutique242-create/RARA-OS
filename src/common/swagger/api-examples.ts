// src/common/swagger/api-examples.ts
/**
 * API Response Examples for Swagger Documentation
 * Real-world examples to help developers understand API responses
 */

export const ApiExamples = {
  // ==================== AUTHENTICATION ====================
  AuthResponses: {
    LoginSuccess: {
      accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      user: {
        id: 'usr_123abc',
        email: 'user@example.com',
        firstName: 'Jean',
        lastName: 'Dupont',
        phone: '+33612345678',
        tenants: [
          {
            id: 'tnt_123abc',
            name: 'Ma Boutique',
            role: 'OWNER',
          },
        ],
      },
    },
    OtpSent: {
      message: 'OTP sent successfully',
      otp_id: 'otp_123abc',
      expiresIn: 600,
    },
    OtpVerified: {
      accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      user: {
        id: 'usr_123abc',
        email: 'user@example.com',
        firstName: 'Jean',
        lastName: 'Dupont',
      },
    },
  },

  // ==================== USERS ====================
  UserResponses: {
    CreateUser: {
      id: 'usr_123abc',
      email: 'newuser@example.com',
      firstName: 'Jean',
      lastName: 'Dupont',
      phone: '+33612345678',
      avatar: 'https://cdn.example.com/avatars/usr_123abc.jpg',
      status: 'ACTIVE',
      createdAt: '2026-02-05T10:30:00Z',
    },
    UserList: {
      data: [
        {
          id: 'usr_123abc',
          email: 'user@example.com',
          firstName: 'Jean',
          lastName: 'Dupont',
          status: 'ACTIVE',
          createdAt: '2026-01-15T08:00:00Z',
        },
      ],
      meta: {
        total: 150,
        page: 1,
        limit: 20,
        pages: 8,
      },
    },
  },

  // ==================== PRODUCTS ====================
  ProductResponses: {
    CreateProduct: {
      id: 'prd_123abc',
      sku: 'PRD-001',
      name: 'Produit Exemple',
      description: 'Description du produit',
      price: 29.99,
      cost: 15.00,
      stock: 100,
      category: {
        id: 'cat_123abc',
        name: 'Électronique',
      },
      status: 'ACTIVE',
      images: ['https://cdn.example.com/products/prd_123abc-1.jpg'],
      createdAt: '2026-02-05T10:30:00Z',
    },
    ProductList: {
      data: [
        {
          id: 'prd_123abc',
          sku: 'PRD-001',
          name: 'Produit Exemple',
          price: 29.99,
          stock: 100,
          status: 'ACTIVE',
        },
      ],
      meta: {
        total: 500,
        page: 1,
        limit: 20,
        pages: 25,
      },
    },
  },

  // ==================== ORDERS ====================
  OrderResponses: {
    CreateOrder: {
      id: 'ord_123abc',
      orderNumber: 'CMD-2026-001',
      customer: {
        id: 'cst_123abc',
        name: 'Client Exemple',
        email: 'client@example.com',
      },
      items: [
        {
          productId: 'prd_123abc',
          name: 'Produit Exemple',
          sku: 'PRD-001',
          quantity: 2,
          unitPrice: 29.99,
          total: 59.98,
        },
      ],
      subtotal: 59.98,
      tax: 10.20,
      shipping: 5.00,
      total: 75.18,
      status: 'PENDING',
      createdAt: '2026-02-05T10:30:00Z',
    },
    OrderList: {
      data: [
        {
          id: 'ord_123abc',
          orderNumber: 'CMD-2026-001',
          customerName: 'Client Exemple',
          total: 75.18,
          status: 'PENDING',
          createdAt: '2026-02-05T10:30:00Z',
        },
      ],
      meta: {
        total: 1200,
        page: 1,
        limit: 20,
        pages: 60,
      },
    },
  },

  // ==================== PAYMENTS ====================
  PaymentResponses: {
    CreatePayment: {
      id: 'pay_123abc',
      orderId: 'ord_123abc',
      amount: 75.18,
      currency: 'EUR',
      method: 'CARD',
      status: 'COMPLETED',
      transactionId: 'txn_stripe_123abc',
      receipt: 'https://api.example.com/receipts/pay_123abc',
      createdAt: '2026-02-05T10:32:00Z',
    },
    PaymentList: {
      data: [
        {
          id: 'pay_123abc',
          orderId: 'ord_123abc',
          amount: 75.18,
          method: 'CARD',
          status: 'COMPLETED',
          createdAt: '2026-02-05T10:32:00Z',
        },
      ],
      meta: {
        total: 500,
        page: 1,
        limit: 20,
        pages: 25,
        totalAmount: 45890.50,
      },
    },
  },

  // ==================== ERRORS ====================
  ErrorResponses: {
    Unauthorized: {
      statusCode: 401,
      message: 'Unauthorized - token invalid or expired',
      error: 'Unauthorized',
    },
    Forbidden: {
      statusCode: 403,
      message: 'Forbidden - insufficient permissions',
      error: 'Forbidden',
    },
    NotFound: {
      statusCode: 404,
      message: 'Resource not found',
      error: 'Not Found',
    },
    ValidationError: {
      statusCode: 400,
      message: 'Validation failed',
      errors: {
        email: ['must be an email'],
        firstName: ['should not be empty'],
      },
    },
    TenantError: {
      statusCode: 403,
      message: 'Access denied - tenant mismatch',
      error: 'Forbidden',
    },
  },

  // ==================== PAGINATION ====================
  PaginatedResponse: {
    data: [],
    meta: {
      total: 100,
      page: 1,
      limit: 20,
      pages: 5,
    },
  },

  // ==================== HEALTH ====================
  HealthResponse: {
    status: 'ok',
    timestamp: '2026-02-05T10:30:00Z',
    uptime: 3600,
    database: {
      status: 'healthy',
      latency: 2,
    },
    cache: {
      status: 'healthy',
    },
  },
};

export const ApiErrorExamples = {
  success: true,
  code: 'SUCCESS',
  data: {},
  timestamp: new Date().toISOString(),
};

export const ApiErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  TENANT_ERROR: 'TENANT_ERROR',
  RATE_LIMIT: 'RATE_LIMIT',
};
