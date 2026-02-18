// Script de diagnostic complet de la synchronisation
const https = require('https');
const { Client } = require('pg');

const API_HOST = 'raya-backend-production.up.railway.app';
const DB_URL = 'postgresql://boutique:56kN6r0R6eb38fS5SZnVGQ@rayamanager-12-12604.jxf.gcp-europe-west3.cockroachlabs.cloud:26257/defaultdb?sslmode=require';

// Helper pour requêtes HTTPS
function apiRequest(path, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: API_HOST,
      path: '/api' + path,
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (data) options.headers['Content-Length'] = Buffer.byteLength(data);
    if (token) options.headers['Authorization'] = `Bearer ${token}`;
    
    const req = https.request(options, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  console.log('='.repeat(60));
  console.log('DIAGNOSTIC DE SYNCHRONISATION RAYA OS');
  console.log('='.repeat(60));
  
  const issues = [];
  
  // 1. Test connexion à la base de données
  console.log('\n1. Test connexion CockroachDB...');
  const client = new Client({ connectionString: DB_URL });
  try {
    await client.connect();
    console.log('   ✅ Connexion OK');
  } catch (e) {
    console.log('   ❌ Erreur:', e.message);
    issues.push('DB: Connexion échouée');
    return;
  }
  
  // 2. Vérifier tables sync
  console.log('\n2. Vérifier tables de sync...');
  const tables = await client.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name IN ('tenant_data', 'event_log', 'tenant_data_history')
  `);
  const foundTables = tables.rows.map(r => r.table_name);
  console.log('   Tables trouvées:', foundTables.join(', ') || 'aucune');
  if (!foundTables.includes('tenant_data')) {
    issues.push('SYNC: Table tenant_data manquante');
  }
  
  // 3. Vérifier données dans tenant_data
  console.log('\n3. Données synchronisées (tenant_data)...');
  const syncData = await client.query(`
    SELECT "tenantId", "collection", length("data") as size, "version", "updatedAt"
    FROM tenant_data ORDER BY "collection"
  `);
  if (syncData.rows.length === 0) {
    console.log('   ⚠️  Aucune donnée dans tenant_data');
    issues.push('SYNC: Aucune donnée synchronisée');
  } else {
    console.log(`   ${syncData.rows.length} collections:`);
    let totalSize = 0;
    for (const row of syncData.rows) {
      const size = parseInt(row.size) || 0;
      totalSize += size;
      const sizeStr = size > 1000000 ? `${(size/1000000).toFixed(1)}MB` : size > 1000 ? `${(size/1000).toFixed(1)}KB` : `${size}B`;
      console.log(`   - ${row.collection}: ${sizeStr} (v${row.version})`);
    }
    console.log(`   Total: ${(totalSize/1000000).toFixed(2)}MB`);
  }
  
  // 4. Vérifier utilisateurs
  console.log('\n4. Utilisateurs dans la base...');
  const users = await client.query('SELECT email, role, status, tenant_id FROM users');
  console.log(`   ${users.rows.length} utilisateurs:`);
  for (const u of users.rows) {
    console.log(`   - ${u.email} (${u.role}, tenant=${u.tenant_id}, ${u.status})`);
  }
  
  // 5. Vérifier tenants
  console.log('\n5. Tenants (entreprises)...');
  const tenants = await client.query('SELECT id, "tenantCode", name, status FROM tenants');
  console.log(`   ${tenants.rows.length} tenant(s):`);
  for (const t of tenants.rows) {
    console.log(`   - ID=${t.id}: ${t.name} (${t.tenantCode}, ${t.status})`);
  }
  
  // 6. Test API health
  console.log('\n6. Test endpoint /health...');
  try {
    const health = await apiRequest('/health');
    if (health.status === 200 && health.data?.status === 'ok') {
      console.log('   ✅ API health OK');
    } else {
      console.log('   ⚠️  Status:', health.status, health.data);
    }
  } catch (e) {
    console.log('   ❌ Erreur:', e.message);
    issues.push('API: Health check échoué');
  }
  
  // 7. Test login
  console.log('\n7. Test login API...');
  let token = null;
  try {
    const login = await apiRequest('/auth/login', 'POST', { email: 'pdg1@gmail.com', password: 'Pdg2026!' });
    if (login.status === 200 && login.data?.accessToken) {
      token = login.data.accessToken;
      console.log('   ✅ Login OK (token reçu)');
      console.log('   User:', login.data.user?.email, 'Role:', login.data.user?.role, 'Tenant:', login.data.user?.tenantId);
    } else {
      console.log('   ❌ Login échoué:', login.status, login.data?.message || '');
      issues.push('API: Login échoué');
    }
  } catch (e) {
    console.log('   ❌ Erreur:', e.message);
    issues.push('API: Login erreur');
  }
  
  // 8. Test endpoint /sync (avec token)
  if (token) {
    console.log('\n8. Test endpoint /sync...');
    try {
      const sync = await apiRequest('/sync', 'GET', null, token);
      if (sync.status === 200 && sync.data?.collections) {
        const cols = Object.keys(sync.data.collections);
        console.log('   ✅ Sync GET OK');
        console.log('   Tenant:', sync.data.tenantId);
        console.log('   Collections:', cols.length);
        
        // Vérifier collections critiques
        const critical = ['products', 'users', 'orders', 'clients', 'financialTransactions'];
        for (const c of critical) {
          const data = sync.data.collections[c];
          if (data && data.length > 0) {
            console.log(`   - ${c}: ${data.length} items ✅`);
          } else {
            console.log(`   - ${c}: vide ou absent ⚠️`);
          }
        }
      } else {
        console.log('   ❌ Sync GET échoué:', sync.status);
        issues.push('API: Sync GET échoué');
      }
    } catch (e) {
      console.log('   ❌ Erreur:', e.message);
      issues.push('API: Sync erreur');
    }
  }
  
  // 9. Vérifier problèmes potentiels dans le code frontend
  console.log('\n9. Vérifications code frontend...');
  const frontendChecks = [
    { name: 'registerUser method', pattern: 'registerUser(data)' },
    { name: 'syncAllFromCloud after login', pattern: 'syncAllFromCloud' },
    { name: 'syncAllToCloud periodic', pattern: 'syncAllToCloud' }
  ];
  // (Ces vérifications seraient faites manuellement)
  console.log('   (Vérification manuelle requise pour le frontend)');
  
  // Résumé
  console.log('\n' + '='.repeat(60));
  console.log('RÉSUMÉ');
  console.log('='.repeat(60));
  
  if (issues.length === 0) {
    console.log('✅ Aucun problème majeur détecté!');
  } else {
    console.log(`❌ ${issues.length} problème(s) détecté(s):`);
    for (const issue of issues) {
      console.log(`   - ${issue}`);
    }
  }
  
  await client.end();
}

main().catch(e => console.error('Fatal:', e.message));
