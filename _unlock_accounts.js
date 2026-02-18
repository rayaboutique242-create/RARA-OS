const {Client} = require('pg');
const bcrypt = require('bcrypt');

(async () => {
  const c = new Client({
    connectionString: 'postgresql://boutique:56kN6r0R6eb38fS5SZnVGQ@rayamanager-12-12604.jxf.gcp-europe-west3.cockroachlabs.cloud:26257/defaultdb?sslmode=require'
  });
  await c.connect();

  // Show all users
  const users = await c.query('SELECT id, email, username, role, failed_login_attempts, locked_until FROM users');
  console.log('=== ALL USERS ===');
  users.rows.forEach(u => console.log(u.email, '| role:', u.role, '| failed:', u.failed_login_attempts, '| locked:', u.locked_until));

  // Reset lockout for all users
  await c.query('UPDATE users SET failed_login_attempts = 0, locked_until = NULL');
  console.log('\n✅ Lockout reset for all users');

  // Reset passwords
  const pdgHash = await bcrypt.hash('Pdg2026!', 12);
  const mgrHash = await bcrypt.hash('Manager2026!', 12);

  await c.query('UPDATE users SET password_hash = $1 WHERE email = $2', [pdgHash, 'pdg1@gmail.com']);
  await c.query('UPDATE users SET password_hash = $1 WHERE email = $2', [mgrHash, 'manager1@gmail.com']);
  console.log('✅ Passwords reset: pdg1@gmail.com=Pdg2026! manager1@gmail.com=Manager2026!');

  // Verify
  const check = await c.query('SELECT email, failed_login_attempts, locked_until FROM users');
  check.rows.forEach(u => console.log('  ', u.email, '| failed:', u.failed_login_attempts, '| locked:', u.locked_until));

  await c.end();
  console.log('\nDone!');
})().catch(e => console.error(e));
