const { Client } = require('pg');
const c = new Client({
  connectionString: 'postgresql://boutique:56kN6r0R6eb38fS5SZnVGQ@rayamanager-12-12604.jxf.gcp-europe-west3.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full'
});

async function main() {
  await c.connect();
  const res = await c.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
  console.log('Total tables:', res.rows.length);
  res.rows.forEach(r => console.log(' -', r.table_name));
  await c.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
