// src/config/env.validation.ts
import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
  MinLength,
  validateSync,
  IsUrl,
  IsEmail,
} from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
  Staging = 'staging',
}

export class EnvironmentVariables {
  // ==================== Application ====================
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  @IsString()
  @IsOptional()
  LOG_LEVEL?: string = 'debug';

  // ==================== Database ====================
  @IsString()
  DB_TYPE: string = 'better-sqlite3';

  @IsString()
  DB_DATABASE: string = 'raya_dev.sqlite';

  @IsString()
  @IsOptional()
  DATABASE_URL?: string; // Railway / cloud providers inject this

  @IsString()
  @IsOptional()
  DB_HOST?: string;

  @IsNumber()
  @IsOptional()
  DB_PORT?: number;

  @IsString()
  @IsOptional()
  DB_USERNAME?: string;

  @IsString()
  @IsOptional()
  DB_PASSWORD?: string;

  @IsOptional()
  DB_SYNCHRONIZE?: string = 'true';

  @IsOptional()
  DB_SSL?: string;

  // ==================== JWT (required) ====================
  @IsString()
  @MinLength(16, { message: 'JWT_SECRET must be at least 16 characters long' })
  JWT_SECRET: string;

  @IsString()
  @MinLength(16, { message: 'JWT_REFRESH_SECRET must be at least 16 characters long' })
  JWT_REFRESH_SECRET: string;

  @IsNumber()
  @Min(60)
  JWT_EXPIRES_IN: number = 3600;

  @IsNumber()
  @Min(3600)
  JWT_REFRESH_EXPIRES_IN: number = 604800;

  // ==================== CORS ====================
  @IsString()
  @IsOptional()
  ALLOWED_ORIGINS?: string;

  @IsString()
  @IsOptional()
  FRONTEND_URL?: string = 'http://localhost:4200';

  @IsString()
  @IsOptional()
  PRODUCTION_URL?: string;

  @IsString()
  @IsOptional()
  STAGING_URL?: string;

  @IsString()
  @IsOptional()
  PRODUCTION_ADMIN_URL?: string;

  // ==================== Redis / Cache ====================
  @IsString()
  @IsOptional()
  REDIS_URL?: string; // Railway injects this

  @IsString()
  @IsOptional()
  REDIS_HOST?: string;

  @IsNumber()
  @IsOptional()
  REDIS_PORT?: number;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD?: string;

  @IsNumber()
  @IsOptional()
  REDIS_DB?: number = 0;

  @IsNumber()
  @IsOptional()
  CACHE_TTL?: number = 300;

  // ==================== Rate Limiting ====================
  @IsNumber()
  @IsOptional()
  RATE_LIMIT_TTL?: number = 60;

  @IsNumber()
  @IsOptional()
  RATE_LIMIT_MAX?: number = 100;

  // ==================== SMTP / Email ====================
  @IsString()
  @IsOptional()
  SMTP_HOST?: string;

  @IsNumber()
  @IsOptional()
  SMTP_PORT?: number = 587;

  @IsString()
  @IsOptional()
  SMTP_USER?: string;

  @IsString()
  @IsOptional()
  SMTP_PASS?: string;

  @IsString()
  @IsOptional()
  SMTP_FROM?: string;

  @IsString()
  @IsOptional()
  APP_NAME?: string = 'Raya';

  // ==================== OAuth (optional) ====================
  @IsString()
  @IsOptional()
  GOOGLE_CLIENT_ID?: string;

  @IsString()
  @IsOptional()
  GOOGLE_CLIENT_SECRET?: string;

  @IsString()
  @IsOptional()
  GOOGLE_CALLBACK_URL?: string;

  @IsString()
  @IsOptional()
  GITHUB_CLIENT_ID?: string;

  @IsString()
  @IsOptional()
  GITHUB_CLIENT_SECRET?: string;

  @IsString()
  @IsOptional()
  GITHUB_CALLBACK_URL?: string;

  // ==================== 2FA ====================
  @IsString()
  @IsOptional()
  TWO_FACTOR_APP_NAME?: string = 'RayaBoutique';

  // ==================== Files ====================
  @IsString()
  @IsOptional()
  UPLOAD_DIR?: string = './uploads';

  @IsString()
  @IsOptional()
  BACKUP_DIR?: string = './backups';

  @IsNumber()
  @IsOptional()
  MAX_FILE_SIZE?: number = 10485760;

  // ==================== Multi-Tenant ====================
  @IsString()
  @IsOptional()
  DEFAULT_TENANT_ID?: string = 'default';
}

/**
 * Validate environment variables on application startup.
 * Throws a detailed error if required variables are missing or malformed.
 */
export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
    whitelist: false,       // Allow extra env vars
    forbidUnknownValues: false,
  });

  if (errors.length > 0) {
    const messages = errors.map((err) => {
      const constraints = Object.values(err.constraints || {}).join(', ');
      return `  - ${err.property}: ${constraints}`;
    });

    throw new Error(
      `\n❌ Environment validation failed:\n${messages.join('\n')}\n\n` +
      `💡 Check your .env file. See .env.example for reference.\n`,
    );
  }

  return validatedConfig;
}
