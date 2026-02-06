# Swagger/OpenAPI Configuration Guide

**Version**: 2.0  
**Framework**: NestJS 11  
**Status**: ✅ Production Ready

---

## Overview

The RAYA API includes comprehensive Swagger/OpenAPI documentation automatically generated from source code:

- **URL**: http://localhost:3000/api/docs (development)
- **Updated**: Automatically on every request
- **Format**: OpenAPI 3.0
- **Features**: Try-it-out, request history, token persistence

---

## Current Configuration

### Main Swagger Setup (src/main.ts)

```typescript
const config = new DocumentBuilder()
  .setTitle('Raya API')
  .setDescription('Multi-tenant e-commerce platform API')
  .setVersion('2.0')
  .addBearerAuth()  // JWT Authentication
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
```

### Features Enabled

- ✅ Bearer token authentication
- ✅ Tag-based organization (30+ tags)
- ✅ Request/response examples
- ✅ Try-it-out functionality
- ✅ JSON & YAML export
- ✅ Request history
- ✅ Token persistence

---

## Using Swagger Decorators

### Endpoint Documentation

```typescript
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@Controller('products')
@ApiTags('Products')
export class ProductsController {
  
  @Get()
  @ApiOperation({
    summary: 'List products',
    description: 'Get paginated list of products with filters'
  })
  @ApiResponse({
    status: 200,
    description: 'Products retrieved successfully',
    type: [ProductDto]
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid filter parameters'
  })
  async getProducts(@Query() query) {
    // Implementation
  }
  
  @Post()
  @ApiOperation({ summary: 'Create product' })
  @ApiBody({ type: CreateProductDto })
  @ApiBearerAuth()  // Requires authentication
  @ApiResponse({
    status: 201,
    description: 'Product created',
    type: ProductDto
  })
  async createProduct(@Body() createDto: CreateProductDto) {
    // Implementation
  }
}
```

### DTO Documentation

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, Min } from 'class-validator';

export class ProductDto {
  @ApiProperty({
    description: 'Product unique identifier',
    example: 'prd_123abc',
    readOnly: true
  })
  id: string;

  @ApiProperty({
    description: 'Product SKU',
    example: 'PRD-001',
    minLength: 3,
    maxLength: 50
  })
  @IsString()
  sku: string;

  @ApiProperty({
    example: 'iPhone 15 Pro',
    maxLength: 100
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: 'Latest Apple flagship',
    required: false
  })
  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({
    type: Number,
    example: 999.99,
    minimum: 0.01
  })
  @IsNumber()
  @Min(0.01)
  price: number;

  @ApiProperty({
    type: Boolean,
    example: true,
    default: true
  })
  active: boolean;

  @ApiProperty({
    type: Date,
    example: '2026-02-05T10:30:00Z',
    readOnly: true
  })
  createdAt: Date;
}
```

### Query Parameters

```typescript
export class ListProductsQueryDto {
  @ApiPropertyOptional({
    type: Number,
    example: 1,
    description: 'Page number'
  })
  @IsOptional()
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({
    type: Number,
    example: 20,
    description: 'Items per page (max 100)'
  })
  @IsOptional()
  @IsNumber()
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    type: String,
    example: 'iPhone',
    description: 'Search term'
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: ['ACTIVE', 'INACTIVE', 'DISCONTINUED'],
    example: 'ACTIVE'
  })
  status?: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED';
}
```

### Array Examples

```typescript
export class CreateOrderDto {
  @ApiProperty({
    type: 'array',
    items: {
      type: 'object',
      properties: {
        productId: {
          type: 'string',
          example: 'prd_123abc'
        },
        quantity: {
          type: 'number',
          example: 2,
          minimum: 1
        },
        unitPrice: {
          type: 'number',
          example: 29.99
        }
      }
    },
    example: [
      { productId: 'prd_123abc', quantity: 2, unitPrice: 29.99 },
      { productId: 'prd_456def', quantity: 1, unitPrice: 99.99 }
    ]
  })
  items: OrderItemDto[];
}
```

---

## Reusable Decorators

Use the custom decorators library (`src/common/swagger/swagger-decorators.ts`):

```typescript
import {
  AuthRequired,
  ApiCrudRead,
  ApiCrudCreate,
  ApiCrudUpdate,
  ApiCrudDelete,
  ApiAuthEndpoint
} from 'src/common/swagger';

@Controller('users')
@ApiTags('Users')
export class UsersController {
  
  @Get()
  @ApiCrudRead('Users', 'Get paginated list of all users')
  @AuthRequired()
  async list(@Query() query) { }
  
  @Post()
  @ApiCrudCreate('User', 'Create new user account')
  @AuthRequired()
  async create(@Body() dto) { }
  
  @Get(':id')
  @ApiCrudRead('User Details')
  @AuthRequired()
  async getOne(@Param('id') id: string) { }
  
  @Put(':id')
  @ApiCrudUpdate('User')
  @AuthRequired()
  async update(@Param('id') id: string, @Body() dto) { }
  
  @Delete(':id')
  @ApiCrudDelete('User')
  @AuthRequired()
  async delete(@Param('id') id: string) { }
  
  @Post(':id/change-password')
  @ApiAuthEndpoint('Change user password')
  async changePassword(@Param('id') id: string, @Body() dto) { }
}
```

---

## API Tags Organization

Available tags (from main.ts):

### Core/Authentication
- **Auth** - Login, OTP, registration, token management
- **Security - 2FA** - Two-factor authentication setup

### Multi-Tenant
- **Tenants - Multi-Boutiques** - Company/shop management
- **Invitations - Gestion des Adhesions** - Invitations and memberships
- **User Tenants - Memberships** - Multi-tenant user roles

### Business
- **Products** - Product catalog management
- **Categories** - Product categories
- **Orders** - Order processing
- **Customers** - CRM operations
- **Suppliers** - Vendor management
- **Inventory** - Stock levels and movements
- **Deliveries** - Shipping tracking
- **Payments** - Payment processing
- **Promotions** - Discounts and coupons

### Operations
- **Reports** - Analytics and reporting
- **Notifications** - Alerts and messaging
- **Settings** - Configuration
- **Security** - Access control
- **Audit** - Activity logging

---

## Response Format Patterns

### Standard List Response

```typescript
export class PaginatedResponseDto<T> {
  @ApiProperty()
  data: T[];

  @ApiProperty({
    type: 'object',
    properties: {
      total: { type: 'number' },
      page: { type: 'number' },
      limit: { type: 'number' },
      pages: { type: 'number' }
    }
  })
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}
```

### Standard Error Response

```typescript
export class ErrorResponseDto {
  @ApiProperty({ example: false })
  success: boolean;

  @ApiProperty({ example: 'VALIDATION_ERROR' })
  code: string;

  @ApiProperty({ example: 'Validation failed' })
  message: string;

  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiPropertyOptional({
    type: 'object',
    example: { email: ['must be an email'] }
  })
  errors?: Record<string, string[]>;

  @ApiProperty()
  timestamp: Date;
}
```

---

## Authentication in Swagger

### Authorize Button

1. Click ✔️ **Authorize** button
2. Paste your JWT token (without "Bearer " prefix)
3. Click "Authorize"
4. Click "Close"
5. All requests now include token

### Revoking Authorization

1. Click ✔️ **Authorize** button
2. Click "Logout"
3. Click "Close"

### Bearer Token Format

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfMTIzYWJjIiwiaWF0IjoxNjEzMzAwMDAwfQ.SIGNATURE
```

---

## Exporting API Documentation

### OpenAPI JSON

```bash
# Download OpenAPI spec
curl http://localhost:3000/api/docs/json > openapi.json
```

### Swagger YAML

```bash
# Download Swagger YAML
curl http://localhost:3000/api/docs/yaml > swagger.yaml
```

### Postman Collection

```bash
# Generate Postman collection from OpenAPI
npm install -g openapi-to-postman

openapi2postman -s openapi.json -o postman-collection.json
```

---

## Customizing Swagger UI

Edit the Swagger setup in `main.ts`:

```typescript
SwaggerModule.setup('api/docs', app, document, {
  swaggerOptions: {
    // Customize UI
    persistAuthorization: true,           // Keep token after refresh
    tagsSorter: 'alpha',                  // Sort tags alphabetically
    operationsSorter: 'alpha',            // Sort operations alphabetically
    docExpansion: 'none',                 // Don't expand all operations
    filter: true,                         // Show filter box
    showRequestDuration: true,            // Show request duration
    displayOperationId: false,            // Hide operation IDs
    
    // Authorize on load
    onComplete: function() {
      console.log('Swagger UI loaded');
    }
  },
  
  // Custom styling
  customSiteTitle: 'Raya API Documentation',
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 20px 0 }
    .swagger-ui .info .title { font-size: 2em; color: #1890ff; }
    .swagger-ui .info .description { font-size: 0.9em; color: #666; }
    .swagger-ui .btn { font-weight: 600; }
  `
});
```

---

## API Documentation Workflow

### 1. Develop Endpoint

```typescript
@Post('products')
@ApiOperation({ summary: 'Create product' })
async create(@Body() createDto: CreateProductDto) {
  return this.productsService.create(createDto);
}
```

### 2. Document DTO

```typescript
export class CreateProductDto {
  @ApiProperty({ example: 'PRD-001' })
  @IsString()
  sku: string;
  
  // ... more properties with @ApiProperty
}
```

### 3. Add Examples

Use `example` in @ApiProperty:

```typescript
@ApiProperty({
  description: 'Product price',
  example: 29.99,
  type: Number,
  minimum: 0.01
})
price: number;
```

### 4. Test in Swagger

1. Go to http://localhost:3000/api/docs
2. Find your endpoint
3. Click "Try it out"
4. Enter data
5. Click "Execute"

### 5. Review Response

Swagger shows:
- Status code
- Response headers
- Response body (formatted JSON)
- cURL equivalent

---

## Best Practices

✅ **DO**:
- Add @ApiProperty to all DTO fields
- Include meaningful examples
- Use @ApiOperation for clear descriptions
- Group related endpoints with @ApiTags
- Document error responses
- Use reusable decorators
- Keep descriptions concise

❌ **DON'T**:
- Leave DTOs without documentation
- Use vague examples (e.g., "abc123" instead of "prd_123abc")
- Forget error response codes
- Duplicate decorator logic
- Use complex nested examples without explanation

---

## Troubleshooting

### Endpoints Not Showing in Swagger

**Problem**: New endpoint not appearing

**Solution**:
1. Add @ApiTags() decorator
2. Add @ApiOperation() decorator
3. Document request/response with @ApiResponse()
4. Restart server: `npm run start:dev`
5. Hard refresh browser: Ctrl+Shift+Delete

### DTO Fields Missing

**Problem**: Some fields not showing in schema

**Solution**:
1. Add @ApiProperty() to each field
2. Add @IsNotEmpty(), @IsString(), etc. decorators
3. Export DTO class properly
4. Check imports are correct

### Token Not Persisting

**Problem**: Token cleared after page refresh

**Solution**: Ensure `persistAuthorization: true` is set in Swagger options

### Examples Not Showing

**Problem**: Example values not displayed

**Solution**:
1. Add `example: value` to @ApiProperty()
2. Use realistic examples
3. For complex objects, use `type` property

---

## Integration with CI/CD

### Generate OpenAPI Spec

```bash
# Add to package.json scripts
"export-api-spec": "ts-node scripts/export-openapi.ts"
```

### Validate Spec

```bash
npm install --save-dev @apidevtools/swagger-parser

# Validate in CI
swagger-parser validate openapi.json
```

### Generate SDK

```bash
# Generate TypeScript SDK from spec
npm install -g swagger-codegen-cli

swagger-codegen generate -i openapi.json -l typescript-axios -o ./sdk
```

---

## Resources

- 📖 [OpenAPI Specification](https://spec.openapis.org/oas/v3.0.3)
- 📖 [NestJS Swagger Docs](https://docs.nestjs.com/openapi/introduction)
- 📖 [Swagger UI Guide](https://swagger.io/tools/swagger-ui/)
- 🔧 [Swagger Editor](https://editor.swagger.io)
- 💾 [Postman Import Guide](https://learning.postman.com/docs/getting-started/importing-and-exporting-data/)

---

**Last Updated**: 2026-02-05  
**Maintained By**: API Documentation Team
