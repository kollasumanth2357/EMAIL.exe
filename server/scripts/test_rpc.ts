import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function test() {
  const client = createClient(url, serviceKey);

  // Check RPC
  const { data, error } = await client.rpc('exec_sql', { sql: 'SELECT 1;' });
  console.log('rpc exec_sql:', { data, error });

  // Test inserting into users
  const { data: insData, error: insError } = await client.from('users').insert({
    id: 'user-sai',
    name: 'Sai',
    email: 'sai@mailpilot.demo'
  }).select();
  console.log('insert users:', { insData, insError });
}

test();
