import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const client = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

async function check() {
  const { data: emails } = await client.from('emails').select('id, subject, status, is_read');
  console.log('Total emails in Supabase:', emails?.length);
  const byStatus: Record<string, number> = {};
  for (const e of (emails || [])) {
    byStatus[e.status] = (byStatus[e.status] || 0) + 1;
    if (e.status !== 'inbox') {
      console.log(`Non-inbox email found -> ID: ${e.id} | Status: "${e.status}" | Subject: "${e.subject}"`);
    }
  }
  console.log('Status breakdown:', byStatus);
}

check();
