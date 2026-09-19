import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const url = process.env.SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const client = createClient(url, serviceKey);

async function checkSentFk() {
  // Test with null original_email_id
  const { error: errNull } = await client.from('sent_emails').upsert({
    id: 'test_sent_null',
    original_email_id: null,
    recipient: 'test@example.com',
    subject: 'Test Null',
    body: 'Test Body',
    sent_at: new Date().toISOString(),
    status: 'Sent'
  });
  console.log('Insert with null original_email_id:', errNull ? errNull.message : 'SUCCESS!');

  // Test with existing email_01
  const { error: errExisting } = await client.from('sent_emails').upsert({
    id: 'test_sent_existing',
    original_email_id: 'email_01',
    recipient: 'test@example.com',
    subject: 'Test Existing',
    body: 'Test Body',
    sent_at: new Date().toISOString(),
    status: 'Sent'
  });
  console.log('Insert with existing email_01:', errExisting ? errExisting.message : 'SUCCESS!');
}

checkSentFk();
