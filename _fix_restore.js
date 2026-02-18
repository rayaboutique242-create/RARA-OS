const { Client } = require('pg');
const c = new Client({
  connectionString: 'postgresql://boutique:56kN6r0R6eb38fS5SZnVGQ@rayamanager-12-12604.jxf.gcp-europe-west3.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full'
});

async function main() {
  await c.connect();
  // Make backupId nullable so the SET NULL FK can be created
  try {
    await c.query('ALTER TABLE "restores" ALTER COLUMN "backupId" DROP NOT NULL');
    console.log('Made backupId nullable');
  } catch (e) {
    console.log('backupId already nullable or error:', e.message);
  }
  await c.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
