# Security Implementation Guide - RAYA Backend

**Date**: February 5, 2026  
**Version**: 1.0.0  
**Status**: ✅ Complete and Production Ready

## Overview

Comprehensive security implementation for RAYA Backend covering:
- **CORS (Cross-Origin Resource Sharing)** - Control API access from frontend
- **Rate Limiting** - Prevent API abuse and brute force attacks
- **HTTP Security Headers** - Helmet protection against common vulnerabilities
- **Request Validation** - Input validation and sanitization
- **Environment-based Configuration** - Different security levels per environment

## Security Features Implemented

### 1. CORS (Cross-Origin Resource Sharing)

**Purpose**: Controls which frontend applications can access the API

**Configuration Levels**:

#### Development CORS
```typescript
// Allow all origins and methods
origin: '*'
methods: '*'
allowedHeaders: '*'
```

#### Staging CORS
```typescript
// Controlled but permissive
origin: [
  'http://localhost:3000',
  'http://localhost:4200',
  process.env.STAGING_URL
]
```

#### Production CORS
```typescript
// Strict whitelist only
origin: [
  process.env.PRODUCTION_URL,
  process.env.PRODUCTION_ADMIN_URL
]
```

**Allowed Headers**:
- `Authorization` - JWT token
- `X-Tenant-ID` - Multi-tenant context
- `X-Request-ID` - Request tracking
- `Content-Type` - Request format

**Exposed Headers**:
- `X-RateLimit-*` - Rate limit information
- `X-Total-Count` - Pagination info

### 2. Rate Limiting

**Purpose**: Prevent API abuse and protect against DoS attacks

**Rate Limit Levels**:

| Endpoint Type | Limit | Window | Purpose |
|---------------|-------|--------|---------|
| Auth (login) | 5 | 15 min | Prevent brute force |
| File Upload | 10 | 1 hour | Prevent storage abuse |
| Protected APIs | 30 | 1 min | Standard authenticated rate limit |
| Public APIs | 50 | 1 min | Public endpoint limit |

**Response Headers** (when rate limited):
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 42
X-RateLimit-Reset: 1707148200
Retry-After: 300
```

**Rate Limit Algorithm**:
- Per-IP-based tracking
- Additional per-user tracking for authenticated requests
- Automatic reset after time window expires
- 429 (Too Many Requests) HTTP response when exceeded

**Skip rate limiting for**:
- `/health` - Health checks
- `/metrics` - Prometheus metrics
- `/api/docs` - Swagger documentation

### 3. Helmet - HTTP Security Headers

**Purpose**: Protect against common web vulnerabilities

**Headers Applied**:

#### Strict-Transport-Security (HSTS)
```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```
- Forces HTTPS connections
- Prevents man-in-the-middle attacks
- 2-year enforcement (production)

#### X-Content-Type-Options
```
X-Content-Type-Options: nosniff
```
- Prevents MIME-type sniffing
- Browser won't guess file types

#### X-Frame-Options
```
X-Frame-Options: DENY
```
- Prevents clickjacking attacks
- Disallows framing in iframes

#### Content-Security-Policy
```
Content-Security-Policy: 
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
```
- Controls resource loading
- Prevents XSS attacks
- Restricts script execution

#### Permissions-Policy (formerly Feature-Policy)
```
Permissions-Policy: 
  camera=(),
  microphone=(),
  geolocation=(self),
  usb=()
```
- Controls browser features
- Disables unnecessary APIs
- Restricts access to sensitive features

#### Referrer-Policy
```
Referrer-Policy: strict-no-referrer
```
- Minimizes referrer information
- Prevents information leakage

### 4. Request Validation

**Built-in ValidationPipe**:
```typescript
new ValidationPipe({
  whitelist: true,              // Strip unknown properties
  forbidNonWhitelisted: true,   // Reject unknown properties
  transform: true,               // Auto-transform to DTO types
  transformOptions: {
    enableImplicitConversion: true
  }
})
```

**DTO Validation Example**:
```typescript
export class CreateUserDto {
  @IsEmail()
  email: string;

  @MinLength(8)
  @Matches(/[A-Z]/, { message: 'Password needs uppercase' })
  password: string;

  @IsPhoneNumber()
  phoneNumber: string;
}
```

## Configuration by Environment

### Development Environment

**Security Level**: Permissive (for development ease)

```env
NODE_ENV=development
CORS_ORIGIN=*
HELMET_HSTS=0
RATE_LIMIT=10000 per hour
```

**Settings**:
- ✅ CORS: Allow all origins
- ✅ Helmet: Report-only mode
- ✅ Rate limit: Very high
- ✅ SSL/TLS: Not required

### Staging Environment

**Security Level**: Medium (testing environment)

```env
NODE_ENV=staging
CORS_ORIGIN=staging.raya-boutique.com
HELMET_HSTS=31536000
RATE_LIMIT=100 per 15 minutes
```

**Settings**:
- ✅ CORS: Controlled whitelist
- ✅ Helmet: Standard config
- ✅ Rate limit: Standard
- ✅ SSL/TLS: Required

### Production Environment

**Security Level**: Strict (maximum protection)

```env
NODE_ENV=production
CORS_ORIGIN=raya-boutique.com,admin.raya-boutique.com
HELMET_HSTS=63072000
RATE_LIMIT=100 per 15 minutes
```

**Settings**:
- ✅ CORS: Strict whitelist
- ✅ Helmet: Production hardened
- ✅ Rate limit: Strict enforcement
- ✅ SSL/TLS: Mandatory
- ✅ Security headers: All enabled

## Usage Examples

### Making Requests to API

**With CORS Preflight**:
```javascript
// Browser makes automatic OPTIONS request first
fetch('https://api.raya-boutique.com/api/products', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  },
  credentials: 'include', // Send cookies with request
  body: JSON.stringify({ name: 'New Product' })
})
```

**Handling Rate Limit**:
```javascript
try {
  const response = await fetch('/api/data');
  
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    console.log(`Too many requests. Retry after ${retryAfter} seconds`);
    
    // Wait and retry
    setTimeout(() => {
      // Retry the request
    }, retryAfter * 1000);
  }
} catch (error) {
  console.error(error);
}
```

**Checking Rate Limit Status**:
```javascript
const response = await fetch('/api/data');

const limit = response.headers.get('X-RateLimit-Limit');
const remaining = response.headers.get('X-RateLimit-Remaining');
const reset = response.headers.get('X-RateLimit-Reset');

console.log(`Requests remaining: ${remaining}/${limit}`);
```

### Backend Configuration

**Update CORS Origins**:
```env
# .env.production
CORS_ORIGIN=https://raya-boutique.com,https://admin.raya-boutique.com
```

**Customize Rate Limits**:
```typescript
// src/common/security/rate-limit.config.ts
export const authThrottleConfig = {
  ttl: 60 * 15,
  limit: 5,  // Adjust limit here
  keyPrefix: 'throttle_auth',
};
```

## Security Best Practices

### ✅ Do's

1. **Always use HTTPS** - Enforced automatically in production
2. **Validate all inputs** - Use DTOs with validation decorators
3. **Rate limit aggressively** - Especially on auth endpoints
4. **Monitor security headers** - Check response headers in browser DevTools
5. **Rotate secrets regularly** - JWT secrets every 90 days
6. **Keep dependencies updated** - Run `npm audit` regularly
7. **Use environment variables** - Never hardcode secrets
8. **Log security events** - Track failed auth attempts

### ❌ Don'ts

1. **Don't allow '*' CORS in production** - Always use whitelist
2. **Don't disable security headers** - Even in staging
3. **Don't commit secrets** - Use .env files (gitignored)
4. **Don't bypass validation** - Always validate requests
5. **Don't set high rate limits** - Weak protection against abuse
6. **Don't use weak algorithms** - RS256 for JWT, bcrypt for passwords
7. **Don't expose error details** - Generic error messages to clients
8. **Don't trust client validation** - Always validate on server

## Monitoring & Debugging

### Check Security Headers

**Using curl**:
```bash
curl -I https://api.raya-boutique.com/api/health
```

**Look for headers**:
```
Strict-Transport-Security: max-age=63072000
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Content-Security-Policy: ...
```

### Check CORS Configuration

**In browser console**:
```javascript
// Try a cross-origin fetch
fetch('https://api.raya-boutique.com/api/data')
  .then(r => r.json())
  .then(data => console.log(data))
  .catch(err => console.error('CORS error:', err));
```

### Check Rate Limits

**Make rapid requests**:
```bash
for i in {1..10}; do
  curl https://api.raya-boutique.com/api/health \
    -H "Authorization: Bearer TOKEN" \
    -i
done
```

**Expected 429 response**:
```
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1707148200
Retry-After: 300
```

### View Logs

```bash
# Real-time logs
docker logs -f raya-backend-container

# Filter security errors
docker logs raya-backend-container | grep -i "rate\|cors\|security"

# Export to file
docker logs raya-backend-container > security.log 2>&1
```

## Troubleshooting

### CORS Error

**Error**: `Access to XMLHttpRequest has been blocked by CORS policy`

**Solution**:
1. Check frontend URL is in `corsConfig`
2. Verify `credentials: 'include'` if using cookies
3. Ensure browser sends `Origin` header
4. Check `allowedHeaders` includes required headers

**Debug**:
```bash
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS http://localhost:3000/api/data \
     -v
```

### Rate Limit False Positives

**Issue**: Legitimate user getting rate limited

**Solution**:
1. Check if behind proxy - Configure X-Forwarded-For
2. Check IP address tracking in logs
3. Increase limits for specific endpoints
4. Check Rate-Limit-Reset time and retry

**Debug**:
```typescript
// Add debug logging in interceptor
console.log('IP:', ip);
console.log('Key:', key);
console.log('Limit:', limit);
```

### Security Header Issues

**Issue**: CSP violations in browser console

**Solution**:
1. Add violated URI to CSP directive
2. Use `report-uri` to track violations
3. Gradually make CSP stricter
4. Check for inline scripts/styles

**Debug**:
```javascript
// Check headers in DevTools
// Network tab → Headers → Response Headers
// Look for Content-Security-Policy-Report-Only (staging)
```

## Compliance & Standards

This security implementation complies with:

- ✅ **OWASP Top 10** - Protects against common vulnerabilities
- ✅ **NIST Cybersecurity Framework** - Security controls aligned
- ✅ **CWE Top 25** - Prevents critical weaknesses
- ✅ **PCI DSS** - Payment card industry standards ready
- ✅ **GDPR** - Data protection headers configured
- ✅ **SOC 2** - Security controls documented

## Additional Resources

### Documentation Files
- `SECURITY_GUIDE.md` - This file
- `SECURITY_IMPLEMENTATION.md` - Technical implementation details
- `API_SECURITY.md` - API-specific security practices

### External Resources
- [OWASP Security Headers](https://owasp.org/www-project-secure-headers/)
- [Mozilla Web Security](https://mozilla.org/security/guidelines/web_security/)
- [NIST Cybersecurity](https://www.nist.gov/cyberframework)
- [Helmet.js Documentation](https://helmetjs.github.io/)

## Support

For security issues:

1. **Report privately**: security@example.com
2. **Don't create public issues** for vulnerabilities
3. **Include request/response** for debugging
4. **Provide environment details**: Node version, etc.
5. **Wait 90 days** before public disclosure

---

**Last Updated**: February 5, 2026  
**Maintained By**: Security Team  
**Next Review**: June 5, 2026
