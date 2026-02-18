const { Client } = require('pg');
const c = new Client('postgresql://boutique:56kN6r0R6eb38fS5SZnVGQ@rayamanager-12-12604.jxf.gcp-europe-west3.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full');

async function main() {
  await c.connect();
  
  const users = await c.query('SELECT id, email, username, role, status, tenant_id, last_login, created_at FROM users ORDER BY created_at');
  console.log('\n=== USERS ===');
  users.rows.forEach(u => console.log(JSON.stringify(u, null, 2)));

  const tenants = await c.query('SELECT id, "tenantCode", name, status, "subscriptionPlan", email, "ownerName", "ownerEmail", "createdAt" FROM tenants ORDER BY "createdAt"');
  console.log('\n=== TENANTS ===');
  tenants.rows.forEach(t => console.log(JSON.stringify(t, null, 2)));

  const ut = await c.query('SELECT id, user_id, tenant_id, role, status, is_default FROM user_tenants ORDER BY created_at');
  console.log('\n=== USER_TENANTS ===');
  ut.rows.forEach(r => console.log(JSON.stringify(r, null, 2)));

  await c.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
