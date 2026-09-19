import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function checkRestSchema() {
  const res = await fetch(`${url}/rest/v1/`, {
    method: 'GET',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`
    }
  });
  console.log('status:', res.status);
  const data = await res.json();
  console.log('paths in schema:', Object.keys(data.paths || {}));
  console.log('definitions:', Object.keys(data.definitions || {}));
}

checkRestSchema();
