// src/database/data-source.ts
// Standalone TypeORM DataSource for seed scripts and migrations
// Reads DB config from env (supports both SQLite and PostgreSQL)
// IMPORTANT: synchronize is disabled - use migrations instead
import 'dotenv/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import { join } from 'path';

function buildDataSourceOptions(): DataSourceOptions {
  const databaseUrl = process.env.DATABASE_URL;
  const rawDbType = process.env.DB_TYPE || 'better-sqlite3';
  // When DB_HOST is explicitly set, always use explicit config (avoids Railway linked vars)
  const explicitHost = process.env.DB_HOST;
  // Auto-detect postgres from DATABASE_URL
  const isPostgresUrl = !explicitHost && databaseUrl && (databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://'));
  const dbType = explicitHost ? rawDbType : (isPostgresUrl ? 'postgres' : rawDbType);
  const isCockroachDB = dbType === 'cockroachdb';
  const entities = [join(__dirname, '..', '**', '*.entity.{ts,js}')];
  const migrations = [join(__dirname, 'migrations', '*.{ts,js}')];
  
  // synchronize should normally be false - use migrations instead
  // Set DB_SYNCHRONIZE=true for initial setup (will create all tables)
  // Set DB_FORCE_SYNC=true to force sync even in production (emergency only)
  const forceSync = process.env.DB_FORCE_SYNC === 'true';
  const synchronize = forceSync || (process.env.DB_SYNCHRONIZE === 'true' && process.env.NODE_ENV !== 'production');
  const logging = process.env.NODE_ENV === 'development' || process.env.DB_LOGGING === 'true';
  const migrationsRun = process.env.DB_MIGRATIONS_RUN === 'true';

  if (isCockroachDB || dbType === 'postgres') {
    // CockroachDB: use native TypeORM cockroachdb driver
    if (isCockroachDB && explicitHost) {
      return {
        type: 'cockroachdb',
        host: explicitHost,
        port: parseInt(process.env.DB_PORT || '26257', 10),
        username: process.env.DB_USERNAME || 'raya',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_DATABASE || 'defaultdb',
        ssl: { rejectUnauthorized: false },
        timeTravelQueries: false,
        entities,
        migrations,
        synchronize,
        migrationsRun,
        logging,
      };
    }

    // When DB_HOST is explicitly set, use explicit config
    if (explicitHost) {
      return {
        type: 'postgres',
        host: explicitHost,
        port: parseInt(process.env.DB_PORT || '26257', 10),
        username: process.env.DB_USERNAME || 'raya',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_DATABASE || 'defaultdb',
        ssl: { rejectUnauthorized: false },
        entities,
        migrations,
        synchronize,
        migrationsRun,
        logging,
      };
    }

    if (databaseUrl) {
      return {
        type: 'postgres',
        url: databaseUrl,
        ssl: { rejectUnauthorized: false },
        entities,
        migrations,
        synchronize,
        migrationsRun,
        logging,
      };
    }

    return {
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'raya',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'raya',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      entities,
      migrations,
      synchronize,
      migrationsRun,
      logging,
    };
  }

  // SQLite (default for dev)
  return {
    type: 'better-sqlite3',
    database: process.env.DB_DATABASE || join(__dirname, '..', '..', 'raya_dev.sqlite'),
    entities,
    migrations,
    synchronize,
    migrationsRun,
    logging,
  };
}

export const AppDataSource = new DataSource(buildDataSourceOptions());
