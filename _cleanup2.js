// Final cleanup: drop all remaining tables, then sequences and types
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
  
  // Drop all tables - may need multiple passes due to FK dependencies
  for (let pass = 0; pass < 5; pass++) {
    const tables = await client.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
    );
    if (tables.rows.length === 0) break;
    console.log(`Pass ${pass+1}: ${tables.rows.length} tables remaining`);
    for (const row of tables.rows) {
      try {
        await client.query(`DROP TABLE IF EXISTS "public"."${row.table_name}" CASCADE`);
        console.log(`  Dropped: ${row.table_name}`);
      } catch (err) {
        console.log(`  Skip: ${row.table_name} (${err.message.substring(0, 60)})`);
      }
    }
  }

  // Drop sequences
  const sequences = await client.query(
    `SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public'`
  );
  for (const row of sequences.rows) {
    try {
      await client.query(`DROP SEQUENCE IF EXISTS "public"."${row.sequence_name}"`);
      console.log(`Dropped seq: ${row.sequence_name}`);
    } catch (err) {
      console.log(`Skip seq: ${row.sequence_name}`);
    }
  }

  // Drop enum types (without CASCADE since CockroachDB doesn't support it)
  const types = await client.query(
    `SELECT typname FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid WHERE n.nspname = 'public' AND t.typtype = 'e'`
  );
  for (const row of types.rows) {
    try {
      await client.query(`DROP TYPE IF EXISTS "public"."${row.typname}"`);
      console.log(`Dropped type: ${row.typname}`);
    } catch (err) {
      console.log(`Skip type: ${row.typname} (${err.message.substring(0, 60)})`);
    }
  }

  // Final check
  const t = await client.query(`SELECT count(*) as c FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`);
  const s = await client.query(`SELECT count(*) as c FROM information_schema.sequences WHERE sequence_schema = 'public'`);
  const e = await client.query(`SELECT count(*) as c FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid WHERE n.nspname = 'public' AND t.typtype = 'e'`);
  console.log(`\nFINAL: ${t.rows[0].c} tables, ${s.rows[0].c} sequences, ${e.rows[0].c} enum types`);

  await client.end();
}

cleanup().catch(console.error);
