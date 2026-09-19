import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || '';
const anonKey = process.env.SUPABASE_ANON_KEY || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function testKey(name: string, key: string) {
  console.log(`\n=== Testing ${name} ===`);
  const client = createClient(url, key);
  const tables = ['users', 'threads', 'thread_messages', 'emails', 'drafts', 'sent_emails', 'user_style_profiles', 'style_examples'];

  for (const t of tables) {
    const { data, error } = await client.from(t).select('*').limit(1);
    if (error) {
      console.log(`Table [${t}]: ERROR: ${error.message} (${error.code}) - hint: ${error.hint}`);
    } else {
      console.log(`Table [${t}]: SUCCESS! Found ${data?.length} rows`);
    }
  }
}

async function run() {
  await testKey('ANON_KEY', anonKey);
  await testKey('SERVICE_ROLE_KEY', serviceKey);
}

run();
