// Verify CockroachDB is clean
const { Client } = require('pg');

async function verify() {
  const client = new Client({
    host: 'rayamanager-12-12604.jxf.gcp-europe-west3.cockroachlabs.cloud',
    port: 26257,
    user: 'boutique',
    password: '56kN6r0R6eb38fS5SZnVGQ',
    database: 'defaultdb',
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  
  const tables = await client.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
  );
  console.log(`Tables: ${tables.rows.length}`, tables.rows.map(r => r.table_name));
  
  const sequences = await client.query(
    `SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public'`
  );
  console.log(`Sequences: ${sequences.rows.length}`, sequences.rows.map(r => r.sequence_name));
  
  const types = await client.query(
    `SELECT typname FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid WHERE n.nspname = 'public' AND t.typtype = 'e'`
  );
  console.log(`Enums: ${types.rows.length}`, types.rows.map(r => r.typname));

  // Drop remaining sequences if any
  for (const row of sequences.rows) {
    try {
      await client.query(`DROP SEQUENCE IF EXISTS "${row.sequence_name}" CASCADE`);
      console.log(`Dropped sequence: ${row.sequence_name}`);
    } catch (err) {
      console.error(`Error: ${err.message}`);
    }
  }

  // Drop remaining enums if any
  for (const row of types.rows) {
    try {
      await client.query(`DROP TYPE IF EXISTS "${row.typname}" CASCADE`);
      console.log(`Dropped type: ${row.typname}`);
    } catch (err) {
      console.error(`Error: ${err.message}`);
    }
  }

  // Final check
  const t2 = await client.query(`SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`);
  const s2 = await client.query(`SELECT count(*) FROM information_schema.sequences WHERE sequence_schema = 'public'`);
  console.log(`\nFinal: ${t2.rows[0].count} tables, ${s2.rows[0].count} sequences`);

  await client.end();
}

verify().catch(console.error);
