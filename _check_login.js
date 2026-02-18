const { Client } = require('pg');
const c = new Client({
  connectionString: 'postgresql://boutique:56kN6r0R6eb38fS5SZnVGQ@rayamanager-12-12604.jxf.gcp-europe-west3.cockroachlabs.cloud:26257/defaultdb?sslmode=require'
});

(async () => {
  await c.connect();
  
  // Get columns
  const cols = await c.query("SELECT column_name FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position");
  console.log('User columns:', cols.rows.map(x=>x.column_name).join(', '));
  
  // Check users
  const users = await c.query('SELECT email, role, status, password_hash FROM users');
  console.log('\nUsers:', JSON.stringify(users.rows.map(u => ({...u, password_hash: u.password_hash ? u.password_hash.substring(0,15)+'...' : 'NULL'})), null, 2));
  
  // Check tenant_data table
  try {
    const td = await c.query('SELECT "tenantId", "collection", length("data") as data_len, "version" FROM tenant_data LIMIT 20');
    console.log('\ntenant_data rows:', JSON.stringify(td.rows, null, 2));
  } catch(e) {
    console.log('\ntenant_data error:', e.message);
  }
  
  // Check tenants
  const tenants = await c.query('SELECT id, "tenantCode", name, status FROM tenants');
  console.log('\nTenants:', JSON.stringify(tenants.rows, null, 2));
  
  // Check user_tenants
  try {
    const ut = await c.query('SELECT * FROM user_tenants LIMIT 10');
    console.log('\nUserTenants:', JSON.stringify(ut.rows, null, 2));
  } catch(e) {
    console.log('\nUserTenants error:', e.message);
  }
  
  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });
