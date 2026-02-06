// src/monitoring/filters/global-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggerService } from '../services/logger.service';
import { SentryService } from '../services/sentry.service';
import { MetricsService } from '../services/metrics.service';

@Catch()
@Injectable()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    private loggerService: LoggerService,
    private sentryService: SentryService,
    private metricsService: MetricsService,
  ) {
    this.loggerService.setContext('GlobalExceptionFilter');
  }

  async catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Determine status and message
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorCode = 'INTERNAL_ERROR';
    let validationErrors: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || message;
        errorCode = (exceptionResponse as any).error || errorCode;
        validationErrors = (exceptionResponse as any).validationErrors;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // Extract user info from request
    const user = (request as any).user;
    const tenantId = user?.tenantId;
    const userId = user?.sub || user?.id;
    const userEmail = user?.email;

    // Build context for logging
    const logContext = {
      tenantId,
      userId,
      userEmail,
      endpoint: request.url,
      method: request.method,
      ipAddress: request.ip || request.socket?.remoteAddress,
      userAgent: request.get('user-agent'),
      requestBody: this.sanitizeBody(request.body),
      errorCode,
    };

    // Log based on severity
    if (status >= 500) {
      // Server errors - log to database and Sentry
      const trace = exception instanceof Error ? exception.stack : undefined;
      this.loggerService.error(message, trace, logContext);

      // Send to Sentry for 5xx errors
      if (exception instanceof Error) {
        await this.sentryService.captureException(exception, {
          tenantId,
          userId,
          userEmail,
          endpoint: request.url,
          method: request.method,
          ipAddress: logContext.ipAddress,
          tags: {
            status: String(status),
            errorCode,
          },
          extra: {
            requestBody: logContext.requestBody,
          },
        });
      }

      // Record error metric
      this.metricsService.recordRequest(
        request.route?.path || request.url,
        request.method,
        status,
        0, // Response time not calculated in filter
        tenantId,
      );
    } else if (status >= 400) {
      // Client errors - warn level
      this.loggerService.warn(`[${status}] ${message}`, {
        endpoint: request.url,
        method: request.method,
        errorCode,
        userId,
      });
    }

    // Build response
    const errorResponse: any = {
      statusCode: status,
      error: errorCode,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Include validation errors if present
    if (validationErrors) {
      errorResponse.validationErrors = validationErrors;
    }

    // Include request ID if present
    const requestId = request.get('X-Request-ID');
    if (requestId) {
      errorResponse.requestId = requestId;
    }

    // Don't expose stack traces in production
    if (process.env.NODE_ENV !== 'production' && exception instanceof Error) {
      errorResponse.stack = exception.stack;
    }

    response.status(status).json(errorResponse);
  }

  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') return body;

    const sensitiveFields = [
      'password',
      'newPassword',
      'currentPassword',
      'confirmPassword',
      'token',
      'refreshToken',
      'accessToken',
      'secret',
      'apiKey',
      'creditCard',
      'cvv',
      'ssn',
    ];

    const sanitized = { ...body };
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}
