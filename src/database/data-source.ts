// src/database/data-source.ts
// Standalone TypeORM DataSource for seed scripts and migrations
// Reads DB config from env (supports both SQLite and PostgreSQL)
import 'dotenv/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import { join } from 'path';

function buildDataSourceOptions(): DataSourceOptions {
  const databaseUrl = process.env.DATABASE_URL;
  const rawDbType = process.env.DB_TYPE || 'better-sqlite3';
  // Auto-detect postgres from DATABASE_URL
  const isPostgresUrl = databaseUrl && (databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://'));
  const dbType = isPostgresUrl ? 'postgres' : rawDbType;
  const entities = [join(__dirname, '..', '**', '*.entity.{ts,js}')];
  const migrations = [join(__dirname, 'migrations', '*.{ts,js}')];

  if (dbType === 'postgres') {
    if (databaseUrl) {
      return {
        type: 'postgres',
        url: databaseUrl,
        ssl: { rejectUnauthorized: false },
        entities,
        migrations,
        synchronize: process.env.NODE_ENV !== 'production',
        logging: process.env.NODE_ENV === 'development',
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
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.NODE_ENV === 'development',
    };
  }

  // SQLite (default for dev)
  return {
    type: 'better-sqlite3',
    database: process.env.DB_DATABASE || join(__dirname, '..', '..', 'raya_dev.sqlite'),
    entities,
    migrations,
    synchronize: true,
    logging: false,
  };
}

export const AppDataSource = new DataSource(buildDataSourceOptions());
