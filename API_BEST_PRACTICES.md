# API Best Practices & Advanced Usage

**For**: Developers integrating with RAYA API  
**Level**: Intermediate to Advanced

---

## Table of Contents

1. [Authentication Best Practices](#authentication-best-practices)
2. [Error Handling](#error-handling)
3. [Pagination Patterns](#pagination-patterns)
4. [Caching Strategy](#caching-strategy)
5. [Security Considerations](#security-considerations)
6. [Performance Optimization](#performance-optimization)
7. [Webhook Integration](#webhook-integration)
8. [Batch Operations](#batch-operations)
9. [API Client Libraries](#api-client-libraries)
10. [Monitoring & Observability](#monitoring--observability)

---

## Authentication Best Practices

### 1. Token Security

**Never expose tokens:**
```javascript
// ❌ BAD - Token in URL
fetch('http://api.example.com/users?token=abc123')

// ❌ BAD - Token in logs
console.log('Token:', accessToken)

// ✅ GOOD - Token in Authorization header
fetch('http://api.example.com/users', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
})
```

### 2. Token Rotation

Refresh tokens before they expire:

```javascript
// Store token issue time
const tokenIssuedAt = Math.floor(Date.now() / 1000);

// Refresh if less than 1 hour remaining
if (Math.floor(Date.now() / 1000) - tokenIssuedAt > 23 * 3600) {
  const newToken = await refreshAccessToken(refreshToken);
  localStorage.setItem('accessToken', newToken.accessToken);
}
```

### 3. OTP Implementation

For high-security flows:

```javascript
async function secureLogin(email) {
  // Step 1: Request OTP
  const { otp_id } = await api.post('/auth/otp/send', { email });
  
  // Step 2: Wait for user input
  const code = await getUserInput('Enter 6-digit code');
  
  // Step 3: Verify OTP
  const { accessToken } = await api.post('/auth/otp/verify', {
    otp_id,
    code
  });
  
  // Step 4: Use token
  api.setDefaultHeader('Authorization', `Bearer ${accessToken}`);
}
```

### 4. Multi-Tenant Context

Always include tenant when necessary:

```javascript
const headers = {
  'Authorization': `Bearer ${accessToken}`,
  'X-Tenant-Id': currentTenant.id,  // Required for tenant-specific operations
  'X-Request-Id': generateRequestId()  // For tracing
};

fetch('/api/products', { headers });
```

---

## Error Handling

### Comprehensive Error Handler

```javascript
class ApiError extends Error {
  constructor(response) {
    super(response.message);
    this.statusCode = response.statusCode;
    this.code = response.code;
    this.errors = response.errors;
    this.retryable = [408, 429, 500, 502, 503, 504].includes(response.statusCode);
  }
}

async function handleApiCall(fn, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof ApiError) {
        // Handle specific errors
        if (error.code === 'UNAUTHORIZED') {
          await refreshToken();
          continue;
        }
        
        if (error.code === 'RATE_LIMIT') {
          const resetTime = parseInt(error.response.headers['x-ratelimit-reset']);
          await sleep(resetTime - Date.now());
          continue;
        }
        
        if (error.retryable && i < retries - 1) {
          await sleep(Math.pow(2, i) * 1000);  // Exponential backoff
          continue;
        }
      }
      
      throw error;
    }
  }
}

// Usage
try {
  const users = await handleApiCall(() => api.get('/users'));
} catch (error) {
  console.error('Failed after retries:', error);
}
```

### Validation Error Handling

```javascript
async function createProduct(data) {
  try {
    return await api.post('/products', data);
  } catch (error) {
    if (error.code === 'VALIDATION_ERROR') {
      // Show field-specific errors
      Object.entries(error.errors).forEach(([field, messages]) => {
        showFieldError(field, messages[0]);
      });
      return null;
    }
    throw error;
  }
}
```

---

## Pagination Patterns

### Sequential Pagination

```javascript
async function getAllProducts() {
  const products = [];
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
    const response = await api.get('/products', {
      params: { page, limit: 100 }
    });
    
    products.push(...response.data);
    hasMore = page < response.meta.pages;
    page++;
  }
  
  return products;
}
```

### Cursor-Based Pagination (Recommended)

```javascript
async function streamProducts(onBatch) {
  let cursor = null;
  let hasMore = true;
  
  while (hasMore) {
    const response = await api.get('/products', {
      params: {
        limit: 100,
        cursor: cursor
      }
    });
    
    await onBatch(response.data);
    
    cursor = response.cursor;
    hasMore = cursor !== null;
  }
}

// Usage
await streamProducts(async (batch) => {
  await processBatch(batch);
});
```

### Parallel Pagination

```javascript
async function getAllProductsParallel(totalPages) {
  const pagePromises = [];
  
  for (let page = 1; page <= totalPages; page++) {
    pagePromises.push(
      api.get('/products', {
        params: { page, limit: 100 }
      })
    );
  }
  
  const responses = await Promise.all(pagePromises);
  return responses.flatMap(r => r.data);
}
```

---

## Caching Strategy

### Response Caching

```javascript
class CachedApiClient {
  constructor(client) {
    this.client = client;
    this.cache = new Map();
  }
  
  async get(endpoint, options = {}) {
    const cacheKey = `${endpoint}:${JSON.stringify(options)}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.time < cached.ttl) {
      return cached.data;
    }
    
    const data = await this.client.get(endpoint, options);
    
    this.cache.set(cacheKey, {
      data,
      time: Date.now(),
      ttl: options.cacheTtl || 5 * 60 * 1000  // 5 minutes default
    });
    
    return data;
  }
  
  invalidate(pattern) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

// Usage
const api = new CachedApiClient(httpClient);

// Cache for 10 minutes
const products = await api.get('/products', { cacheTtl: 600000 });

// Invalidate cache when product updated
await api.post('/products', newData);
api.invalidate('/products');
```

### ETag-Based Caching

```javascript
class ETagCache {
  constructor() {
    this.cache = new Map();
  }
  
  async get(url) {
    const cached = this.cache.get(url);
    const headers = {};
    
    if (cached?.etag) {
      headers['If-None-Match'] = cached.etag;
    }
    
    try {
      const response = await fetch(url, { headers });
      
      if (response.status === 304) {
        // Not modified
        return cached.data;
      }
      
      const data = await response.json();
      const etag = response.headers.get('etag');
      
      this.cache.set(url, { data, etag });
      return data;
    } catch (error) {
      return cached?.data;
    }
  }
}
```

---

## Security Considerations

### 1. Input Validation

```javascript
import { z } from 'zod';

const productSchema = z.object({
  name: z.string().min(3).max(100),
  price: z.number().positive(),
  stock: z.number().int().nonnegative(),
  categoryId: z.string().uuid()
});

async function createProduct(data) {
  const validated = productSchema.parse(data);
  return await api.post('/products', validated);
}
```

### 2. CSRF Protection

```javascript
// Most frameworks include CSRF tokens automatically
// For custom implementations:

const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;

fetch('/api/products', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': csrfToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(data)
});
```

### 3. SQL Injection Prevention

```javascript
// ❌ BAD - Query injection
const response = await api.get(`/users?filter=${userInput}`);

// ✅ GOOD - Use parameter abstraction
const response = await api.get('/users', {
  params: {
    filter: {
      search: userInput
    }
  }
});
```

### 4. Rate Limiting Compliance

```javascript
class RateLimitedClient {
  constructor(client) {
    this.client = client;
    this.queue = [];
    this.processing = false;
  }
  
  async request(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.processQueue();
    });
  }
  
  async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    const { fn, resolve, reject } = this.queue.shift();
    
    try {
      const result = await fn();
      resolve(result);
    } catch (error) {
      if (error.statusCode === 429) {
        const resetTime = parseInt(error.headers['x-ratelimit-reset']);
        await sleep(resetTime - Date.now());
        this.queue.unshift({ fn, resolve, reject });
      } else {
        reject(error);
      }
    }
    
    this.processing = false;
    this.processQueue();
  }
}
```

---

## Performance Optimization

### 1. Parallel Requests

```javascript
// Get user, their orders, and products in parallel
const [user, orders, products] = await Promise.all([
  api.get('/users/me'),
  api.get('/orders', { params: { userId: userId } }),
  api.get('/products', { params: { limit: 100 } })
]);
```

### 2. Request Batching

```javascript
class BatchClient {
  constructor(client, batchSize = 10, batchDelay = 100) {
    this.client = client;
    this.batchSize = batchSize;
    this.batchDelay = batchDelay;
    this.queue = [];
    this.timer = null;
  }
  
  async batch(endpoints) {
    return new Promise((resolve, reject) => {
      this.queue.push({ endpoints, resolve, reject });
      
      if (this.queue.length >= this.batchSize) {
        this.flush();
      } else if (!this.timer) {
        this.timer = setTimeout(() => this.flush(), this.batchDelay);
      }
    });
  }
  
  async flush() {
    if (this.timer) clearTimeout(this.timer);
    if (this.queue.length === 0) return;
    
    const batch = this.queue.splice(0, this.batchSize);
    
    const results = await Promise.all(
      batch.map(({ endpoints }) =>
        Promise.all(endpoints.map(ep => this.client.get(ep)))
      )
    );
    
    batch.forEach(({ resolve }, i) => resolve(results[i]));
  }
}
```

### 3. Field Selection

```javascript
// Only request needed fields
const users = await api.get('/users', {
  params: {
    fields: ['id', 'email', 'firstName', 'lastName']
  }
});
```

---

## Webhook Integration

### Receiving Webhooks

```javascript
import express from 'express';
import crypto from 'crypto';

const app = express();

app.post('/webhooks/order-created', (req, res) => {
  // Verify webhook signature
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.stringify(req.body);
  const hash = crypto.createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');
  
  if (hash !== signature) {
    return res.status(401).send('Unauthorized');
  }
  
  // Process webhook
  const { orderId, customerId, total } = req.body;
  
  handleNewOrder({ orderId, customerId, total });
  
  res.status(200).json({ success: true });
});
```

### Retrying Failed Webhooks

```javascript
async function retryWebhook(webhookId, maxRetries = 5) {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      const webhook = await api.get(`/webhooks/${webhookId}`);
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': generateSignature(webhook.payload)
        },
        body: webhook.payload
      });
      
      if (response.ok) {
        await api.patch(`/webhooks/${webhookId}`, { status: 'SUCCESS' });
        return true;
      }
    } catch (error) {
      retries++;
      if (retries < maxRetries) {
        await sleep(Math.pow(2, retries) * 1000);
      }
    }
  }
  
  await api.patch(`/webhooks/${webhookId}`, { status: 'FAILED' });
  return false;
}
```

---

## Batch Operations

### Bulk Create

```javascript
async function bulkCreateProducts(products) {
  const batchSize = 100;
  const results = [];
  
  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    const batchResults = await api.post('/products/bulk', { products: batch });
    results.push(...batchResults);
  }
  
  return results;
}
```

### Bulk Update

```javascript
async function bulkUpdatePrices(updates) {
  // updates: [{ id, newPrice }, ...]
  return await api.patch('/products/bulk', { updates });
}
```

### Bulk Delete

```javascript
async function bulkDeleteProducts(productIds) {
  return await api.delete('/products/bulk', {
    data: { ids: productIds }
  });
}
```

---

## API Client Libraries

### JavaScript/Node.js - Axios

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 10000
});

// Add auth to all requests
api.interceptors.request.use(config => {
  config.headers.Authorization = `Bearer ${getToken()}`;
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response.status === 401) {
      await refreshToken();
      return api(error.config);
    }
    throw error;
  }
);
```

### Python - Requests

```python
import requests
from requests.auth import HTTPBearerAuth

class RayaClient:
    def __init__(self, token):
        self.base_url = "http://localhost:3000/api"
        self.auth = HTTPBearerAuth(token)
    
    def create_product(self, **kwargs):
        response = requests.post(
            f"{self.base_url}/products",
            json=kwargs,
            auth=self.auth
        )
        return response.json()

client = RayaClient(token)
product = client.create_product(
    name="iPhone 15",
    price=999.99,
    stock=50
)
```

### C# - HttpClient

```csharp
using System.Net.Http;
using System.Net.Http.Headers;

class RayaClient
{
    private HttpClient _client;
    
    public RayaClient(string token)
    {
        _client = new HttpClient();
        _client.DefaultRequestHeaders.Authorization = 
            new AuthenticationHeaderValue("Bearer", token);
    }
    
    public async Task<Product> CreateProduct(ProductDto product)
    {
        var response = await _client.PostAsJsonAsync(
            "http://localhost:3000/api/products",
            product
        );
        return await response.Content.ReadAsAsync<Product>();
    }
}
```

---

## Monitoring & Observability

### Request Logging

```javascript
const api = axios.create({
  baseURL: 'http://localhost:3000/api'
});

api.interceptors.request.use(config => {
  const requestId = generateRequestId();
  config.headers['X-Request-Id'] = requestId;
  
  console.log('API Request', {
    requestId,
    method: config.method.toUpperCase(),
    url: config.url,
    timestamp: new Date().toISOString()
  });
  
  config.metadata = { startTime: Date.now() };
  return config;
});

api.interceptors.response.use(
  response => {
    const duration = Date.now() - response.config.metadata.startTime;
    
    console.log('API Response', {
      requestId: response.headers['x-request-id'],
      statusCode: response.status,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });
    
    return response;
  }
);
```

### Performance Monitoring

```javascript
// Track slow endpoints
const slowEndpoints = new Map();

api.interceptors.response.use(response => {
  const duration = Date.now() - response.config.metadata.startTime;
  const threshold = 1000;  // 1 second
  
  if (duration > threshold) {
    const endpoint = response.config.url;
    if (!slowEndpoints.has(endpoint)) {
      slowEndpoints.set(endpoint, []);
    }
    slowEndpoints.get(endpoint).push(duration);
    
    // Alert if consistently slow
    const durations = slowEndpoints.get(endpoint);
    const avg = durations.reduce((a, b) => a + b) / durations.length;
    if (avg > threshold) {
      console.warn(`Slow endpoint: ${endpoint} (avg: ${avg}ms)`);
    }
  }
  
  return response;
});
```

---

**Last Updated**: 2026-02-05  
**Version**: 1.0
