import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkSchema() {
  // Test if email can have null thread_id
  const { error } = await client.from('emails').upsert({
    id: 'test_null_thread',
    thread_id: null,
    sender: 'test@example.com',
    sender_name: 'Test',
    recipient: 'sai@techflow.io',
    subject: 'Test Subject',
    body: 'Test Body',
    timestamp: new Date().toISOString(),
    priority: 'Low',
    topic: 'Other',
    summary: 'Test summary',
    is_read: true,
    status: 'inbox'
  });
  console.log('Email with thread_id: null ->', error ? error.message : 'SUCCESS!');
  await client.from('emails').delete().eq('id', 'test_null_thread');
}

checkSchema();
