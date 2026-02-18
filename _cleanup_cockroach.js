// Script to clean up all tables and sequences in CockroachDB
const { Client } = require('pg');

async function cleanup() {
  const client = new Client({
    host: 'rayamanager-12-12604.jxf.gcp-europe-west3.cockroachlabs.cloud',
    port: 26257,
    user: 'boutique',
    password: '56kN6r0R6eb38fS5SZnVGQ',
    database: 'defaultdb',
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('Connected to CockroachDB');

  // List all tables
  const tables = await client.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
  );
  console.log(`Found ${tables.rows.length} tables:`, tables.rows.map(r => r.table_name));

  // List all sequences
  const sequences = await client.query(
    `SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public'`
  );
  console.log(`Found ${sequences.rows.length} sequences:`, sequences.rows.map(r => r.sequence_name));

  // Drop all tables with CASCADE
  for (const row of tables.rows) {
    try {
      await client.query(`DROP TABLE IF EXISTS "${row.table_name}" CASCADE`);
      console.log(`Dropped table: ${row.table_name}`);
    } catch (err) {
      console.error(`Error dropping table ${row.table_name}:`, err.message);
    }
  }

  // Drop all sequences
  for (const row of sequences.rows) {
    try {
      await client.query(`DROP SEQUENCE IF EXISTS "${row.sequence_name}" CASCADE`);
      console.log(`Dropped sequence: ${row.sequence_name}`);
    } catch (err) {
      console.error(`Error dropping sequence ${row.sequence_name}:`, err.message);
    }
  }

  // Drop all types/enums
  const types = await client.query(
    `SELECT typname FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid WHERE n.nspname = 'public' AND t.typtype = 'e'`
  );
  console.log(`Found ${types.rows.length} enum types:`, types.rows.map(r => r.typname));
  
  for (const row of types.rows) {
    try {
      await client.query(`DROP TYPE IF EXISTS "${row.typname}" CASCADE`);
      console.log(`Dropped type: ${row.typname}`);
    } catch (err) {
      console.error(`Error dropping type ${row.typname}:`, err.message);
    }
  }

  // Verify cleanup
  const remaining = await client.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
  );
  const remainingSeq = await client.query(
    `SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public'`
  );
  console.log(`\nAfter cleanup: ${remaining.rows.length} tables, ${remainingSeq.rows.length} sequences remaining`);

  await client.end();
  console.log('Done!');
}

cleanup().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
