// Script pour réinitialiser un mot de passe utilisateur
const { Client } = require('pg');
const bcrypt = require('bcrypt');

const EMAIL = process.argv[2] || 'manager1@gmail.com';
const NEW_PASSWORD = process.argv[3] || 'Manager2026!';

const client = new Client({
  connectionString: 'postgresql://boutique:56kN6r0R6eb38fS5SZnVGQ@rayamanager-12-12604.jxf.gcp-europe-west3.cockroachlabs.cloud:26257/defaultdb?sslmode=require'
});

(async () => {
  await client.connect();
  
  // Check user exists
  const check = await client.query('SELECT id, email, role FROM users WHERE email = $1', [EMAIL]);
  if (check.rows.length === 0) {
    console.log('❌ User not found:', EMAIL);
    await client.end();
    process.exit(1);
  }
  
  console.log('Found user:', check.rows[0]);
  
  // Hash new password
  const hash = await bcrypt.hash(NEW_PASSWORD, 10);
  
  // Update password
  await client.query('UPDATE users SET password_hash = $1 WHERE email = $2', [hash, EMAIL]);
  
  console.log('✅ Password updated for', EMAIL);
  console.log('   New password:', NEW_PASSWORD);
  
  await client.end();
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
