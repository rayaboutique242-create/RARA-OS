// Idempotent CockroachDB sync with auto-retry on ECONNRESET
// Run: npx ts-node --project tsconfig.json _sync_cockroach.ts

process.env.DB_TYPE = 'cockroachdb';
process.env.DB_HOST = 'rayamanager-12-12604.jxf.gcp-europe-west3.cockroachlabs.cloud';
process.env.DB_PORT = '26257';
process.env.DB_USERNAME = 'boutique';
process.env.DB_PASSWORD = '56kN6r0R6eb38fS5SZnVGQ';
process.env.DB_DATABASE = 'defaultdb';
process.env.DB_SSL = 'true';
process.env.DB_FORCE_SYNC = 'true';
process.env.NODE_ENV = 'development';

import { DataSource } from 'typeorm';
import { join } from 'path';

const MAX_RETRIES = 10;

async function createDS() {
  return new DataSource({
    type: 'cockroachdb',
    host: process.env.DB_HOST!,
    port: 26257,
    username: process.env.DB_USERNAME!,
    password: process.env.DB_PASSWORD!,
    database: process.env.DB_DATABASE!,
    ssl: { rejectUnauthorized: false },
    timeTravelQueries: false,
    entities: [join(__dirname, 'src', '**', '*.entity.{ts,js}')],
    synchronize: true,
    dropSchema: false,
    logging: ['error', 'schema', 'warn'],
    extra: {
      keepAlive: true,
      keepAliveInitialDelayMillis: 5000,
      connectionTimeoutMillis: 30000,
    },
    poolSize: 1,
  } as any);
}

async function main() {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`\n=== Attempt ${attempt}/${MAX_RETRIES} ===`);
    const ds = await createDS();
    try {
      await ds.initialize();
      const res = await ds.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`
      );
      console.log(`✅ Sync OK! ${res.length} tables:`);
      res.forEach((r: any) => console.log(`  - ${r.table_name}`));
      await ds.destroy();
      console.log('\nDone!');
      return;
    } catch (err: any) {
      console.error(`❌ Attempt ${attempt}: ${err.message}`);
      if (err.driverError) console.error(`   Driver: ${err.driverError.message}`);
      try { await ds.destroy(); } catch {}
      if (attempt < MAX_RETRIES) {
        const wait = 3000 + attempt * 2000;
        console.log(`   Waiting ${wait / 1000}s before retry...`);
        await new Promise(r => setTimeout(r, wait));
      }
    }
  }
  console.error(`Failed after ${MAX_RETRIES} attempts`);
  process.exit(1);
}

main();
