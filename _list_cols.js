const {Client} = require('pg');
(async () => {
  const c = new Client({
    connectionString: 'postgresql://boutique:56kN6r0R6eb38fS5SZnVGQ@rayamanager-12-12604.jxf.gcp-europe-west3.cockroachlabs.cloud:26257/defaultdb?sslmode=require'
  });
  await c.connect();
  const r = await c.query("SELECT column_name FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position");
  r.rows.forEach(row => console.log(row.column_name));
  await c.end();
})().catch(e => console.error(e.message));
