// Nuclear cleanup: DROP ALL in public schema then verify
const { Client } = require('pg');

async function nuke() {
  const client = new Client({
    host: 'rayamanager-12-12604.jxf.gcp-europe-west3.cockroachlabs.cloud',
    port: 26257,
    user: 'boutique',
    password: '56kN6r0R6eb38fS5SZnVGQ',
    database: 'defaultdb',
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('Connected');

  // Multiple passes to handle dependencies
  for (let pass = 0; pass < 10; pass++) {
    const tables = await client.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
    );
    if (tables.rows.length === 0) {
      console.log(`Pass ${pass+1}: All tables dropped!`);
      break;
    }
    console.log(`Pass ${pass+1}: ${tables.rows.length} tables left`);
    for (const row of tables.rows) {
      try {
        await client.query(`DROP TABLE IF EXISTS "public"."${row.table_name}" CASCADE`);
      } catch (err) { /* ignore */ }
    }
  }

  // Drop all sequences
  const seqs = await client.query(`SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public'`);
  for (const row of seqs.rows) {
    try { await client.query(`DROP SEQUENCE IF EXISTS "public"."${row.sequence_name}"`); } catch(e) {}
  }
  console.log(`Dropped ${seqs.rows.length} sequences`);

  // Drop enum types without CASCADE (CockroachDB limitation)
  const types = await client.query(`SELECT typname FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid WHERE n.nspname = 'public' AND t.typtype = 'e'`);
  for (const row of types.rows) {
    try { await client.query(`DROP TYPE IF EXISTS "public"."${row.typname}"`); } catch(e) {}
  }
  console.log(`Dropped ${types.rows.length} enum types`);

  // Final verification
  const t = await client.query(`SELECT count(*)::int as c FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`);
  const s = await client.query(`SELECT count(*)::int as c FROM information_schema.sequences WHERE sequence_schema = 'public'`);
  const e = await client.query(`SELECT count(*)::int as c FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid WHERE n.nspname = 'public' AND t.typtype = 'e'`);
  console.log(`DONE: ${t.rows[0].c} tables, ${s.rows[0].c} sequences, ${e.rows[0].c} enums`);

  await client.end();
}

nuke().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
