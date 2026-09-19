import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function checkSqlEndpoint() {
  const endpoints = [
    '/pg/query',
    '/database/query',
    '/sql',
    '/rest/v1/'
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(`${url}${ep}`, {
        method: 'POST',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: 'SELECT 1;' })
      });
      console.log(ep, 'status:', res.status, await res.text().catch(() => ''));
    } catch (e: any) {
      console.log(ep, 'error:', e.message);
    }
  }
}

checkSqlEndpoint();
