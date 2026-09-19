import dotenv from 'dotenv';
dotenv.config();

import { checkSupabaseHealth, supabase } from '../src/config/supabase.js';
import { aiService } from '../src/services/ai.service.js';
import { store } from '../src/services/store.service.js';

async function runPhase1Verification() {
  console.log('================================================================');
  console.log('🚀 PHASE 1 VERIFICATION: GROQ AI & SUPABASE HARMONIZATION');
  console.log('================================================================\n');

  let passes = 0;
  let failures = 0;

  function assert(name: string, condition: boolean, details?: string) {
    if (condition) {
      console.log(`✅ PASS: ${name}${details ? ` (${details})` : ''}`);
      passes++;
    } else {
      console.error(`❌ FAIL: ${name}${details ? ` (${details})` : ''}`);
      failures++;
    }
  }

  // -------------------------------------------------------------
  // Test 1: Supabase Connection & Permissions
  // -------------------------------------------------------------
  console.log('--- TEST 1: SUPABASE POSTGRESQL CONNECTIVITY ---');
  const supabaseHealth = await checkSupabaseHealth();
  console.log('Supabase Health status:', supabaseHealth);
  assert('Supabase is reachable and authenticated', supabaseHealth.available, supabaseHealth.error);

  if (supabase) {
    const { data: emails, error: emailErr } = await supabase.from('emails').select('id, subject, priority, topic').limit(3);
    assert('Supabase read from emails table', !emailErr && Array.isArray(emails), `Found: ${emails?.length || 0} rows`);

    const { data: threads, error: threadErr } = await supabase.from('threads').select('id, subject').limit(3);
    assert('Supabase read from threads table', !threadErr && Array.isArray(threads), `Found: ${threads?.length || 0} rows`);
  }

  // -------------------------------------------------------------
  // Test 2: Groq AI Configuration & Live Call
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: GROQ API LIVE INVOCATION ---');
  const aiStatus = aiService.getAIStatus();
  console.log('AI Service Status:', aiStatus);
  assert('AI Provider is Groq', aiStatus.provider === 'groq');
  assert('AI Model is llama-3.3-70b-versatile', aiStatus.model === 'llama-3.3-70b-versatile');
  assert('Groq client is configured with key', aiStatus.configured);

  console.log('Sending live classification request to Groq API (llama-3.3-70b-versatile)...');
  const testEmail = {
    subject: 'CRITICAL: Database connection pool exhausted in production cluster',
    body: 'We are experiencing elevated 503 errors on the primary API gateway. Please restart the replica pool immediately.',
    sender: 'alex@company.com',
    sender_name: 'Alex Rivera'
  };

  const startTime = Date.now();
  const triageResult = await aiService.classifyEmail(testEmail);
  const duration = Date.now() - startTime;
  console.log(`Groq Response received in ${duration}ms:`, triageResult);

  assert('Groq returned Urgent priority for critical incident', triageResult.priority === 'Urgent', `Received: ${triageResult.priority}`);
  assert('Groq returned Action Required or Work topic', ['Action Required', 'Work'].includes(triageResult.topic), `Received: ${triageResult.topic}`);
  assert('Groq returned a 2-line concise summary', triageResult.summary.length > 10, `Summary: "${triageResult.summary.replace(/\n/g, ' ')}"`);

  // -------------------------------------------------------------
  // Test 3: Structured AI Output & Schema Enforcement
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: STRUCTURED OUTPUT SCHEMA VALIDATION ---');
  const validPriorities = ['Urgent', 'Normal', 'Low'];
  const validTopics = ['Work', 'Personal', 'Newsletter', 'Action Required', 'Other'];

  assert('Priority is in allowed enum list', validPriorities.includes(triageResult.priority));
  assert('Topic is in allowed enum list', validTopics.includes(triageResult.topic));
  assert('Summary is non-empty string without long paragraphs', typeof triageResult.summary === 'string' && triageResult.summary.length < 300);

  // -------------------------------------------------------------
  // Test 4: AI Connection Test Helper (POST /api/ai/test)
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: AI TEST HELPER METHOD ---');
  const testHelperResult = await aiService.testGroqConnection('Sync on Q3 goals', 'Can we meet for 15 mins to review the OKRs?');
  console.log('Test Helper Output:', testHelperResult);
  assert('testGroqConnection returns provider "groq"', testHelperResult.provider === 'groq');
  assert('testGroqConnection returns model "llama-3.3-70b-versatile"', testHelperResult.model === 'llama-3.3-70b-versatile');
  assert('testGroqConnection classification is valid', validPriorities.includes(testHelperResult.classification.priority));

  // -------------------------------------------------------------
  // Test 5: Existing Endpoints Logic (Store Service)
  // -------------------------------------------------------------
  console.log('\n--- TEST 5: EXISTING CRUD & STORE ENDPOINTS ---');
  const emails = await store.getEmails({ status: 'inbox' });
  assert('store.getEmails returns emails list', Array.isArray(emails) && emails.length > 0, `Count: ${emails.length}`);

  const threads = await store.getThreads();
  assert('store.getThreads returns threads list', Array.isArray(threads) && threads.length > 0, `Count: ${threads.length}`);

  const drafts = await store.getDrafts();
  assert('store.getDrafts returns array', Array.isArray(drafts));

  const stats = await store.getStats();
  assert('store.getStats returns valid metrics', typeof stats.total === 'number' && typeof stats.estimatedMinutesSaved === 'number');

  // -------------------------------------------------------------
  // Test 6: Draft Generation & Send Simulation
  // -------------------------------------------------------------
  console.log('\n--- TEST 6: DRAFT GENERATION & SEND SIMULATION ---');
  if (emails.length > 0) {
    const firstEmail = emails[0];
    const generatedReply = await aiService.generateReply(firstEmail);
    console.log(`Generated reply snippet for "${firstEmail.subject}":`, generatedReply.content.slice(0, 100).replace(/\n/g, ' ') + '...');
    assert('Draft reply was generated with non-empty content', typeof generatedReply.content === 'string' && generatedReply.content.length > 20);
    assert('Tone match scores are present', generatedReply.tone_match_scores?.professional === true);
  }

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`RESULTS: ${passes} PASSED, ${failures} FAILED`);
  console.log('================================================================\n');

  if (failures > 0) {
    process.exit(1);
  }
}

runPhase1Verification().catch(err => {
  console.error('Phase 1 verification crashed:', err);
  process.exit(1);
});
