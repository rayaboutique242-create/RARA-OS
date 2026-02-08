/**
 * baseline.ts - Transition from synchronize:true to migrations
 * 
 * This script marks the InitialSchema migration as "already run" on an existing database
 * that was created via synchronize:true. After running this script, you can safely
 * disable synchronize and enable migrationsRun.
 * 
 * Usage:
 *   npm run migration:baseline
 * 
 * What it does:
 *   1. Connects to the database using env config
 *   2. Creates the TypeORM "migrations" table if it doesn't exist
 *   3. Inserts a record for InitialSchema1738800000000 as already executed
 *   4. Future migrations will run normally via migration:run or migrationsRun
 */
import 'dotenv/config';
import { AppDataSource } from '../data-source';

const MIGRATION_NAME = 'InitialSchema1738800000000';
const MIGRATION_TIMESTAMP = 1738800000000;

async function baseline() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║  MIGRATION BASELINE - Transition to Migrations      ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');

  try {
    // 1. Connect
    console.log('Connecting to database...');
    await AppDataSource.initialize();
    const dbType = AppDataSource.options.type;
    console.log(`  ✓ Connected (${dbType})`);

    const queryRunner = AppDataSource.createQueryRunner();

    // 2. Create migrations table if not exists
    console.log('\nEnsuring migrations table exists...');
    if (dbType === 'postgres') {
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS "migrations" (
          "id" SERIAL PRIMARY KEY,
          "timestamp" bigint NOT NULL,
          "name" varchar(255) NOT NULL
        )
      `);
    } else {
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS "migrations" (
          "id" integer PRIMARY KEY AUTOINCREMENT,
          "timestamp" bigint NOT NULL,
          "name" varchar(255) NOT NULL
        )
      `);
    }
    console.log('  ✓ migrations table ready');

    // 3. Check if InitialSchema is already recorded
    const existing = await queryRunner.query(
      `SELECT * FROM "migrations" WHERE "name" = $1`,
      [MIGRATION_NAME],
    ).catch(async () => {
      // SQLite doesn't support $1 parameterization in all drivers
      return queryRunner.query(
        `SELECT * FROM "migrations" WHERE "name" = '${MIGRATION_NAME}'`,
      );
    });

    if (existing && existing.length > 0) {
      console.log(`\n  ○ ${MIGRATION_NAME} already recorded — skipping`);
    } else {
      // 4. Insert baseline record
      if (dbType === 'postgres') {
        await queryRunner.query(
          `INSERT INTO "migrations" ("timestamp", "name") VALUES ($1, $2)`,
          [MIGRATION_TIMESTAMP, MIGRATION_NAME],
        );
      } else {
        await queryRunner.query(
          `INSERT INTO "migrations" ("timestamp", "name") VALUES (${MIGRATION_TIMESTAMP}, '${MIGRATION_NAME}')`,
        );
      }
      console.log(`\n  ✓ Recorded ${MIGRATION_NAME} as already executed`);
    }

    // 5. Show current migration status
    const allMigrations = await queryRunner.query(`SELECT * FROM "migrations" ORDER BY "id"`);
    console.log('\nCurrent migration records:');
    for (const m of allMigrations) {
      console.log(`  - [${m.id}] ${m.name} (ts: ${m.timestamp})`);
    }

    await queryRunner.release();
    await AppDataSource.destroy();

    console.log('\n══════════════════════════════════════════════════════');
    console.log('BASELINE COMPLETE');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Set DB_FORCE_SYNC=false (or remove it)');
    console.log('  2. Set DB_SYNCHRONIZE=false (or remove it)');
    console.log('  3. Set DB_MIGRATIONS_RUN=true');
    console.log('  4. Deploy — the app will run any new migrations on startup');
    console.log('══════════════════════════════════════════════════════');
  } catch (error) {
    console.error('\n✗ Baseline failed:', error);
    process.exit(1);
  }
}

baseline();
