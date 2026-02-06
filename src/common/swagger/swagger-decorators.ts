// src/common/swagger/swagger-decorators.ts
/**
 * Reusable Swagger Decorators for common patterns
 * Reduces code duplication and ensures consistency across API documentation
 */

import { applyDecorators } from '@nestjs/common';
import { ApiResponse, ApiOperation, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';

/**
 * Decorator for protected endpoints requiring JWT authentication
 */
export function AuthRequired() {
  return applyDecorators(ApiBearerAuth('JWT-auth'));
}

/**
 * Decorator for standard CRUD read operations
 */
export function ApiCrudRead(
  resourceName: string,
  description?: string,
) {
  return applyDecorators(
    ApiOperation({
      summary: `Get ${resourceName}`,
      description: description || `Retrieves ${resourceName} with pagination and filtering`,
    }),
    ApiQuery({
      name: 'page',
      required: false,
      type: Number,
      description: 'Page number (default: 1)',
      example: 1,
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      type: Number,
      description: 'Items per page (default: 20)',
      example: 20,
    }),
    ApiQuery({
      name: 'search',
      required: false,
      type: String,
      description: 'Search term for filtering',
      example: 'search query',
    }),
    ApiResponse({
      status: 200,
      description: `${resourceName} retrieved successfully`,
      example: {
        data: [],
        meta: {
          total: 0,
          page: 1,
          limit: 20,
          pages: 0,
        },
      },
    }),
  );
}

/**
 * Decorator for standard CRUD create operations
 */
export function ApiCrudCreate(
  resourceName: string,
  description?: string,
) {
  return applyDecorators(
    ApiOperation({
      summary: `Create ${resourceName}`,
      description: description || `Creates a new ${resourceName}`,
    }),
    ApiResponse({
      status: 201,
      description: `${resourceName} created successfully`,
      example: {
        id: 'uuid-string',
        createdAt: new Date().toISOString(),
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Validation error - invalid input data',
      example: {
        statusCode: 400,
        message: 'Validation failed',
        errors: {
          field: ['error message'],
        },
      },
    }),
  );
}

/**
 * Decorator for standard CRUD update operations
 */
export function ApiCrudUpdate(
  resourceName: string,
  description?: string,
) {
  return applyDecorators(
    ApiOperation({
      summary: `Update ${resourceName}`,
      description: description || `Updates an existing ${resourceName}`,
    }),
    ApiParam({
      name: 'id',
      type: 'string',
      description: `${resourceName} ID (UUID)`,
      example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    }),
    ApiResponse({
      status: 200,
      description: `${resourceName} updated successfully`,
    }),
    ApiResponse({
      status: 404,
      description: `${resourceName} not found`,
    }),
  );
}

/**
 * Decorator for standard CRUD delete operations
 */
export function ApiCrudDelete(
  resourceName: string,
  description?: string,
) {
  return applyDecorators(
    ApiOperation({
      summary: `Delete ${resourceName}`,
      description: description || `Deletes ${resourceName}`,
    }),
    ApiParam({
      name: 'id',
      type: 'string',
      description: `${resourceName} ID (UUID)`,
      example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    }),
    ApiResponse({
      status: 200,
      description: `${resourceName} deleted successfully`,
    }),
    ApiResponse({
      status: 404,
      description: `${resourceName} not found`,
    }),
  );
}

/**
 * Decorator for protected CRUD operations (requires auth)
 */
export function ApiProtectedCrudRead(
  resourceName: string,
  description?: string,
) {
  return applyDecorators(
    AuthRequired(),
    ApiCrudRead(resourceName, description),
  );
}

/**
 * Decorator for authentication required endpoints
 */
export function ApiAuthEndpoint(
  summary: string,
  description?: string,
  statusCode: number = 200,
) {
  return applyDecorators(
    AuthRequired(),
    ApiOperation({
      summary,
      description: description || summary,
    }),
    ApiResponse({
      status: statusCode,
      description: 'Success',
    }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized - invalid or missing token',
    }),
  );
}

/**
 * Decorator for error responses
 */
export function ApiErrorResponse(
  statusCode: number,
  description: string,
) {
  return ApiResponse({
    status: statusCode,
    description,
    example: {
      statusCode,
      message: description,
      error: 'Error type',
    },
  });
}
