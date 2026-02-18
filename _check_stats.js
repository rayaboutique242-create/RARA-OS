const { Client } = require('pg');
const c = new Client('postgresql://boutique:56kN6r0R6eb38fS5SZnVGQ@rayamanager-12-12604.jxf.gcp-europe-west3.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full');

async function main() {
  await c.connect();
  
  const orders = await c.query('SELECT count(*) as cnt FROM orders');
  console.log('Commandes:', orders.rows[0].cnt);
  
  const deliveries = await c.query('SELECT count(*) as cnt FROM deliveries');
  console.log('Livraisons:', deliveries.rows[0].cnt);
  
  const transactions = await c.query('SELECT count(*) as cnt FROM transactions');
  console.log('Transactions:', transactions.rows[0].cnt);
  
  const products = await c.query('SELECT count(*) as cnt FROM products');
  console.log('Produits:', products.rows[0].cnt);
  
  const customers = await c.query('SELECT count(*) as cnt FROM customers');
  console.log('Clients:', customers.rows[0].cnt);

  // Check tenant_data for any cached stats
  const td = await c.query("SELECT collection, substring(data::text, 1, 200) as preview FROM tenant_data");
  console.log('\n=== tenant_data ===');
  td.rows.forEach(r => console.log(r.collection, ':', r.preview));

  await c.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
