import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function inspectColumns() {
  const res = await fetch(`${url}/rest/v1/`, {
    method: 'GET',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`
    }
  });
  const data = await res.json();
  for (const [table, def] of Object.entries(data.definitions || {})) {
    const props = (def as any).properties || {};
    console.log(`\nTable [${table}]:`);
    console.log('Columns:', Object.keys(props).join(', '));
  }
}

inspectColumns();
