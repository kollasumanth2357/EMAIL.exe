import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const url = process.env.SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const client = createClient(url, serviceKey);

async function verifyPersistenceAfterRestart() {
  console.log('===========================================================');
  console.log('🔄 VERIFYING SUPABASE PERSISTENCE AFTER BACKEND RESTART');
  console.log('===========================================================\n');

  // 1. Query Supabase PostgreSQL directly
  console.log('Step 1: Direct Supabase PostgreSQL Counts');
  const { count: emailCount } = await client.from('emails').select('*', { count: 'exact', head: true });
  const { count: threadCount } = await client.from('threads').select('*', { count: 'exact', head: true });
  const { count: sentCount } = await client.from('sent_emails').select('*', { count: 'exact', head: true });
  const { count: draftCount } = await client.from('drafts').select('*', { count: 'exact', head: true });
  const { count: profileCount } = await client.from('user_style_profiles').select('*', { count: 'exact', head: true });
  const { count: exampleCount } = await client.from('style_examples').select('*', { count: 'exact', head: true });
  const { data: userData } = await client.from('users').select('*').eq('id', 'user-sai').single();

  console.log(`- Supabase emails table: ${emailCount} rows (Expected: 27)`);
  console.log(`- Supabase threads table: ${threadCount} rows (Expected: 5)`);
  console.log(`- Supabase sent_emails table: ${sentCount} rows (Expected: 12)`);
  console.log(`- Supabase drafts table: ${draftCount} rows (Expected: >=1)`);
  console.log(`- Supabase user_style_profiles table: ${profileCount} rows (Expected: 1)`);
  console.log(`- Supabase style_examples table: ${exampleCount} rows (Expected: 5)`);
  console.log(`- Supabase users table: user-sai (${userData?.name}, ${userData?.email})`);

  // 2. Query Running Backend API (http://localhost:5000/api)
  console.log('\nStep 2: Querying Running Express Backend API');
  const statsRes = await fetch('http://localhost:5000/api/stats');
  const statsData = await statsRes.json();
  console.log('API /api/stats response:', statsData.stats);

  const emailsRes = await fetch('http://localhost:5000/api/emails');
  const emailsData = await emailsRes.json();
  console.log(`API /api/emails returned: ${emailsData.emails?.length} emails`);

  const styleRes = await fetch('http://localhost:5000/api/style');
  const styleData = await styleRes.json();
  console.log(`API /api/style profile tone: "${styleData.profile?.tone}"`);

  if (emailCount === 27 && threadCount === 5 && sentCount === 12 && emailsData.emails?.length === 27) {
    console.log('\n✅ PERSISTENCE CONFIRMED: Supabase PostgreSQL retains all 27 emails, 5 threads, and 12 sent emails across backend restart!');
  } else {
    console.error('❌ Data verification failed.');
    process.exit(1);
  }
}

verifyPersistenceAfterRestart().catch(err => {
  console.error('Verification error:', err);
  process.exit(1);
});
