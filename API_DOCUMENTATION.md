# API Documentation Guide - RAYA

**Version**: 2.0  
**Base URL**: `http://localhost:3000/api` (development) or `https://api.raya.com/api` (production)  
**Swagger Docs**: `http://localhost:3000/api/docs`

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Authentication](#authentication)
3. [Headers & Parameters](#headers--parameters)
4. [Response Format](#response-format)
5. [Error Handling](#error-handling)
6. [Core Endpoints](#core-endpoints)
7. [Rate Limiting](#rate-limiting)
8. [Pagination](#pagination)
9. [Examples](#examples)
10. [Troubleshooting](#troubleshooting)

---

## Quick Start

### 1. Get Your API Token

```bash
# 1. Request OTP
curl -X POST http://localhost:3000/api/auth/otp/send \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@email.com"
  }'

# Response:
{
  "message": "OTP sent successfully",
  "otp_id": "otp_123abc",
  "expiresIn": 600
}

# 2. Verify OTP
curl -X POST http://localhost:3000/api/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{
    "otp_id": "otp_123abc",
    "code": "123456"
  }'

# Response:
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "usr_123abc",
    "email": "your@email.com",
    "firstName": "Jean",
    "lastName": "Dupont"
  }
}
```

### 2. Make Your First Request

```bash
curl -X GET http://localhost:3000/api/users/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Response: Your user profile
```

### 3. Explore Swagger

Open your browser to: **http://localhost:3000/api/docs**

---

## Authentication

### Bearer Token (Recommended)

All protected endpoints require a JWT bearer token:

```bash
Authorization: Bearer <your_jwt_token>
```

### Token Types

| Token | Lifetime | Purpose |
|-------|----------|---------|
| `accessToken` | 24 hours | API requests |
| `refreshToken` | 7 days | Obtain new accessToken |

### Refreshing Token

When your accessToken expires, use refreshToken:

```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

---

## Headers & Parameters

### Required Headers

| Header | Description | Example |
|--------|-------------|---------|
| `Authorization` | Bearer JWT token | `Bearer eyJhb...` |
| `Content-Type` | Request format | `application/json` |

### Optional Headers

| Header | Description | Example |
|--------|-------------|---------|
| `X-Tenant-Id` | Tenant context | `tnt_123abc` |
| `X-Request-Id` | Request tracking | `req_123abc` |
| `X-Forwarded-For` | Client IP (proxy) | `192.168.1.1` |

### Common Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `page` | number | Page number | `1` |
| `limit` | number | Items per page | `20` |
| `search` | string | Search term | `draft` |
| `sort` | string | Sort field | `createdAt:DESC` |
| `filter` | string | JSON filter | `{"status":"ACTIVE"}` |

---

## Response Format

### Success Response (200, 201)

```json
{
  "success": true,
  "code": "SUCCESS",
  "data": {
    "id": "usr_123abc",
    "email": "user@example.com",
    "status": "ACTIVE"
  },
  "timestamp": "2026-02-05T10:30:00Z"
}
```

### Paginated Response

```json
{
  "success": true,
  "code": "SUCCESS",
  "data": [
    { "id": "usr_123abc", "email": "user@example.com" },
    { "id": "usr_456def", "email": "user2@example.com" }
  ],
  "meta": {
    "total": 250,
    "page": 1,
    "limit": 20,
    "pages": 13
  },
  "timestamp": "2026-02-05T10:30:00Z"
}
```

### Empty Response (204)

No response body - HTTP status code indicates success.

---

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "statusCode": 400,
  "errors": {
    "email": ["must be an email"],
    "firstName": ["should not be empty"]
  },
  "timestamp": "2026-02-05T10:30:00Z"
}
```

### HTTP Status Codes

| Code | Meaning | When |
|------|---------|------|
| 200 | OK | Successful request |
| 201 | Created | Resource created |
| 204 | No Content | Successful deletion |
| 400 | Bad Request | Invalid input data |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource already exists |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Internal server error |

### Error Codes

| Code | HTTP | Description | Action |
|------|------|-------------|--------|
| `VALIDATION_ERROR` | 400 | Input validation failed | Fix input data |
| `UNAUTHORIZED` | 401 | Invalid/missing token | Refresh token or login |
| `FORBIDDEN` | 403 | Insufficient permissions | Contact admin |
| `NOT_FOUND` | 404 | Resource doesn't exist | Verify resource ID |
| `CONFLICT` | 409 | Resource already exists | Use different data |
| `TENANT_ERROR` | 403 | Tenant mismatch | Use correct tenant |
| `RATE_LIMIT` | 429 | Too many requests | Wait and retry |
| `INTERNAL_ERROR` | 500 | Server error | Contact support |

---

## Core Endpoints

### Authentication

```
POST   /auth/otp/send           Send OTP code
POST   /auth/otp/verify         Verify OTP and get token
POST   /auth/refresh            Refresh access token
POST   /auth/logout             Logout (invalidate token)
GET    /auth/me                 Get current user profile
```

### Users

```
GET    /users                   List all users (paginated)
POST   /users                   Create new user
GET    /users/:id               Get user by ID
PUT    /users/:id               Update user
DELETE /users/:id               Delete user
POST   /users/:id/change-password    Change password
```

### Tenants (Multi-Shop)

```
GET    /tenants                 List your tenants
POST   /tenants                 Create new tenant
GET    /tenants/:id             Get tenant details
PUT    /tenants/:id             Update tenant
DELETE /tenants/:id             Delete tenant
GET    /tenants/:id/users       List tenant members
POST   /tenants/:id/users       Add member to tenant
DELETE /tenants/:id/users/:userId    Remove member
```

### Products

```
GET    /products                List products (paginated, filterable)
POST   /products                Create product
GET    /products/:id            Get product details
PUT    /products/:id            Update product
DELETE /products/:id            Delete product
POST   /products/:id/upload-image   Upload product image
```

### Orders

```
GET    /orders                  List orders
POST   /orders                  Create order
GET    /orders/:id              Get order details
PUT    /orders/:id              Update order status
POST   /orders/:id/pay          Process payment
GET    /orders/:id/invoice      Get order invoice
```

### Customers

```
GET    /customers               List customers
POST   /customers               Create customer
GET    /customers/:id           Get customer info
PUT    /customers/:id           Update customer
DELETE /customers/:id           Delete customer
```

### Payments

```
GET    /payments                List payments
POST   /payments                Create payment
GET    /payments/:id            Get payment details
POST   /payments/:id/refund     Refund payment
GET    /payments/:id/receipt    Get receipt
```

---

## Rate Limiting

API requests are rate-limited to prevent abuse:

| Plan | Requests/Hour | Requests/Minute |
|------|---------------|-----------------|
| Free | 1,000 | 50 |
| Pro | 10,000 | 500 |
| Enterprise | Unlimited | Unlimited |

### Rate Limit Headers

Response headers include rate limit info:

```
X-RateLimit-Limit: 50
X-RateLimit-Remaining: 42
X-RateLimit-Reset: 1644053400
```

### Handling Rate Limits

When limit exceeded (HTTP 429):

```bash
# Wait until X-RateLimit-Reset timestamp
# Then retry the request

RETRY_AFTER=$(curl -I http://localhost:3000/api/users \
  -H "Authorization: Bearer token" \
  | grep X-RateLimit-Reset | cut -d' ' -f2)

sleep $((RETRY_AFTER - $(date +%s)))
```

---

## Pagination

List endpoints support offset-based pagination:

### Paginating Results

```bash
# Get page 2 with 30 items per page
curl -X GET "http://localhost:3000/api/products?page=2&limit=30" \
  -H "Authorization: Bearer token"
```

### Response Includes Meta

```json
{
  "data": [...],
  "meta": {
    "total": 500,      // Total items in database
    "page": 2,         // Current page
    "limit": 30,       // Items per page
    "pages": 17        // Total pages
  }
}
```

### Navigation Examples

```bash
# First page
page=1

# Last page
pages=17

# Next page
next_page=current_page + 1

# Previous page
prev_page=current_page - 1
```

---

## Examples

### Login with OTP

```bash
#!/bin/bash

EMAIL="user@example.com"
API="http://localhost:3000/api"

# Step 1: Request OTP
OTP_RESPONSE=$(curl -s -X POST "$API/auth/otp/send" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\"}")

OTP_ID=$(echo $OTP_RESPONSE | jq -r '.otp_id')
echo "OTP sent. ID: $OTP_ID"
echo "Enter the code you received:"
read OTP_CODE

# Step 2: Verify OTP
TOKEN_RESPONSE=$(curl -s -X POST "$API/auth/otp/verify" \
  -H "Content-Type: application/json" \
  -d "{\"otp_id\": \"$OTP_ID\", \"code\": \"$OTP_CODE\"}")

ACCESS_TOKEN=$(echo $TOKEN_RESPONSE | jq -r '.accessToken')
echo "Login successful!"
echo "Token: $ACCESS_TOKEN"

# Step 3: Use token
curl -s -X GET "$API/users/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  | jq .
```

### Create Product

```bash
curl -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "PRD-001",
    "name": "iPhone 15 Pro",
    "description": "Latest Apple iPhone",
    "price": 999.99,
    "cost": 650.00,
    "stock": 50,
    "categoryId": "cat_123abc",
    "status": "ACTIVE",
    "images": [
      "https://cdn.example.com/iphone15-1.jpg",
      "https://cdn.example.com/iphone15-2.jpg"
    ]
  }'

# Response:
{
  "success": true,
  "data": {
    "id": "prd_789xyz",
    "sku": "PRD-001",
    "name": "iPhone 15 Pro",
    "price": 999.99,
    "createdAt": "2026-02-05T10:30:00Z"
  }
}
```

### Filter Products

```bash
# Filter by category and price range
curl -X GET "http://localhost:3000/api/products?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "filter": {
      "categoryId": "cat_123abc",
      "price": { "$gte": 100, "$lte": 1000 },
      "status": "ACTIVE"
    }
  }'
```

### Create Order

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "cst_123abc",
    "items": [
      {
        "productId": "prd_789xyz",
        "quantity": 2,
        "unitPrice": 999.99
      }
    ],
    "shippingAddress": {
      "street": "123 Rue de Paris",
      "city": "Paris",
      "postalCode": "75001",
      "country": "FR"
    },
    "notes": "Livrer avant 18h"
  }'
```

---

## Troubleshooting

### "Unauthorized" Error

**Problem**: HTTP 401 response

**Solutions**:
1. Verify token is in Authorization header
2. Check token format: `Bearer <token>`
3. Token may be expired - refresh it
4. Token may be invalid - login again

```bash
# Refresh token
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "eyJ..."}'
```

### "Forbidden" Error

**Problem**: HTTP 403 response

**Causes**:
- Insufficient permissions
- Tenant mismatch
- Resource ownership mismatch

**Solution**: Contact administrator for permissions

### "Validation Error"

**Problem**: HTTP 400 with validation errors

**Solutions**:
1. Check error messages in response
2. Verify all required fields are provided
3. Check data types match schema
4. Review examples in Swagger docs

```bash
# Test validation
curl -X POST http://localhost:3000/api/users \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email",  # Wrong format
    "firstName": ""            # Empty required field
  }'

# Returns 400 with details:
{
  "errors": {
    "email": ["must be an email"],
    "firstName": ["should not be empty"]
  }
}
```

### "Not Found" Error

**Problem**: HTTP 404 response

**Solutions**:
1. Verify resource ID is correct
2. Check resource exists (list endpoint first)
3. Verify tenant context if needed
4. Check resource wasn't deleted

### Rate Limiting

**Problem**: HTTP 429 "Too Many Requests"

**Solution***: Wait for X-RateLimit-Reset time

```bash
# Check rate limit status
RESPONSE=$(curl -i http://localhost:3000/api/users \
  -H "Authorization: Bearer token")

echo "Remaining: $(echo $RESPONSE | grep X-RateLimit-Remaining)"
echo "Reset at: $(echo $RESPONSE | grep X-RateLimit-Reset)"
```

### Slow Responses

**Problem**: Requests taking > 1 second

**Solutions**:
1. Add pagination: `?limit=10` (smaller pages load faster)
2. Use search filter: `?search=term` (reduce dataset)
3. Select specific fields: `?fields=id,name`
4. Check server metrics: `http://localhost:9090/metrics`

---

## API Versioning

Current API version: **2.0**

Version support:
- v2.0 (Current) - Active, recommended
- v1.x (Legacy) - Deprecated, support ends 2026-12-31

Migration guide available at: `/api/docs/migration-v1-v2`

---

## Support

For API support:

- 📖 **Swagger Docs**: http://localhost:3000/api/docs
- 📧 **Email**: api-support@raya.com
- 🐛 **Report Bugs**: https://github.com/raya/api/issues
- 💬 **Community**: https://discord.gg/raya

---

**Last Updated**: 2026-02-05  
**Maintained By**: API Team  
**Next Review**: 2026-03-05
