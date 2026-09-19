import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { demoEmails, demoSentEmails } from '../src/data/demo_dataset.js';

dotenv.config();

const url = process.env.SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const client = createClient(url, serviceKey);

async function testInserts() {
  console.log('Testing emails insert...');
  for (let i = 0; i < demoEmails.length; i++) {
    const e = demoEmails[i];
    const { error } = await client.from('emails').upsert({
      id: e.id,
      thread_id: e.thread_id,
      sender: e.sender,
      sender_name: e.sender_name,
      recipient: e.recipient,
      subject: e.subject,
      body: e.body,
      timestamp: e.timestamp,
      priority: e.priority,
      topic: e.topic,
      summary: e.summary,
      is_read: e.is_read,
      status: e.status,
      created_at: e.created_at
    });
    if (error) {
      console.log(`Email ${i} (${e.id}) ERROR:`, error.message, error.details);
    }
  }

  console.log('Testing sent_emails insert...');
  for (let i = 0; i < demoSentEmails.length; i++) {
    const s = demoSentEmails[i];
    const { error } = await client.from('sent_emails').upsert({
      id: s.id,
      original_email_id: s.original_email_id,
      recipient: s.recipient,
      subject: s.subject,
      body: s.body,
      sent_at: s.sent_at,
      status: s.status
    });
    if (error) {
      console.log(`Sent ${i} (${s.id}) ERROR:`, error.message, error.details);
    }
  }
}

testInserts();
