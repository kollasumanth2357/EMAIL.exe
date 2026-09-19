import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import apiRouter from '../src/routes/api.js';
import { aiService } from '../src/services/ai.service.js';
import { store } from '../src/services/store.service.js';
import { checkSupabaseHealth, supabase } from '../src/config/supabase.js';
import { Priority, Topic, ThreadMessage } from '../src/types/index.js';

async function runPhase3Tests() {
  console.log('================================================================');
  console.log('🚀 PHASE 3 VERIFICATION: AI EMAIL TRIAGE & THREAD SUMMARIZATION');
  console.log('================================================================\n');

  const app = express();
  app.use(express.json());
  app.use('/api', apiRouter);

  app.get('/health', async (_req, res) => {
    const supabaseHealth = await checkSupabaseHealth();
    const aiStatus = aiService.getAIStatus();
    res.json({
      status: 'healthy',
      supabase: supabaseHealth,
      ai: aiStatus
    });
  });

  const TEST_PORT = 5893;
  const BASE = `http://localhost:${TEST_PORT}`;

  const server = app.listen(TEST_PORT, async () => {
    console.log(`Test server running on port ${TEST_PORT}\n`);

    let passed = 0;
    let failed = 0;

    function assert(name: string, condition: boolean, details?: any) {
      if (condition) {
        console.log(`✅ PASS: ${name}${details ? ` (${typeof details === 'string' ? details : JSON.stringify(details)})` : ''}`);
        passed++;
      } else {
        console.error(`❌ FAIL: ${name}${details ? ` (${typeof details === 'string' ? details : JSON.stringify(details)})` : ''}`);
        failed++;
      }
    }

    try {
      // -------------------------------------------------------------
      // Test 1: AI Service Summary Normalizer & Unit Tests
      // -------------------------------------------------------------
      console.log('--- TEST 1: TWO-LINE SUMMARY NORMALIZER ---');
      const bulletInput = `Line 1: Status: Deployment completed successfully.\nLine 2: Action: Team needs to monitor error rates.`;
      const normalizedBullets = aiService.normalizeTwoLineSummary(bulletInput);
      const lines = normalizedBullets.split('\n');
      assert('Summary normalizer outputs 2 lines', lines.length === 2, { count: lines.length });
      assert('Summary strips "Line 1:" and "Status:" labels', !lines[0].toLowerCase().includes('line 1') && !lines[0].toLowerCase().includes('status:'));

      const markdownInput = `* Urgent production hotfix applied.\n* SRE lead to verify replica health.`;
      const normalizedMarkdown = aiService.normalizeTwoLineSummary(markdownInput);
      assert('Summary normalizer strips asterisks and bullet points', !normalizedMarkdown.includes('*'));

      // -------------------------------------------------------------
      // Test 2: AI Classification & Strict Enum Handling
      // -------------------------------------------------------------
      console.log('\n--- TEST 2: AI EMAIL CLASSIFICATION WITH STRICT ENUMS ---');
      const urgentTest = await aiService.classifyEmail({
        subject: 'URGENT: Production API cluster failing health checks',
        body: 'Outage detected in primary region. 500 error rate spiked to 35%. Immediate restart required.',
        sender: 'alerts@mailpilot.demo',
        sender_name: 'DevOps Alert'
      });

      const validPriorities: Priority[] = ['Urgent', 'Normal', 'Low'];
      const validTopics: Topic[] = ['Work', 'Personal', 'Newsletter', 'Action Required', 'Other'];

      assert('Valid priority returned for critical email', validPriorities.includes(urgentTest.priority), { priority: urgentTest.priority });
      assert('High severity classified as Urgent', urgentTest.priority === 'Urgent');
      assert('Valid topic returned', validTopics.includes(urgentTest.topic), { topic: urgentTest.topic });
      assert('Action Required or Work topic', ['Action Required', 'Work'].includes(urgentTest.topic));
      assert('Summary is non-empty and 2 lines', urgentTest.summary.length > 10 && urgentTest.summary.includes('\n'));

      // -------------------------------------------------------------
      // Test 3: Single Email Triage via POST /api/emails/:id/triage
      // -------------------------------------------------------------
      console.log('\n--- TEST 3: POST /api/emails/:id/triage ---');
      // Fetch an existing inbox email to triage
      const emailsRes = await fetch(`${BASE}/api/emails`);
      const emailsData = await emailsRes.json();
      assert('Inbox has emails to test', emailsData.emails && emailsData.emails.length > 0);

      const targetEmail = emailsData.emails[0];
      const triageRes = await fetch(`${BASE}/api/emails/${targetEmail.id}/triage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const triageData = await triageRes.json();

      assert('Single triage returns 200 OK', triageRes.status === 200);
      assert('Single triage success: true', triageData.success === true);
      assert('Triage returned valid priority', validPriorities.includes(triageData.email?.priority), triageData.email?.priority);
      assert('Triage returned valid topic', validTopics.includes(triageData.email?.topic), triageData.email?.topic);
      assert('Triage returned 2-line summary', typeof triageData.email?.summary === 'string' && triageData.email?.summary.length > 5);

      // Verify Supabase persistence by reading back
      const verifyRes = await fetch(`${BASE}/api/emails/${targetEmail.id}`);
      const verifyData = await verifyRes.json();
      assert('Triage values persisted to Supabase', verifyData.email?.priority === triageData.email?.priority && verifyData.email?.topic === triageData.email?.topic);

      // -------------------------------------------------------------
      // Test 4: Thread Summarization via POST /api/threads/:id/summarize
      // -------------------------------------------------------------
      console.log('\n--- TEST 4: POST /api/threads/:id/summarize ---');
      const targetThreadId = targetEmail.thread_id;
      const summarizeRes = await fetch(`${BASE}/api/threads/${targetThreadId}/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const summarizeData = await summarizeRes.json();
      console.log('TargetThreadId:', targetThreadId, 'status:', summarizeRes.status, 'data:', summarizeData);

      assert('Thread summarize returns 200 OK', summarizeRes.status === 200);
      assert('Thread summarize returned success: true', summarizeData.success === true);
      assert('Thread summary contains content', typeof summarizeData.summary === 'string' && summarizeData.summary.length > 10);
      
      const threadSummaryLines = summarizeData.summary.split('\n').filter((l: string) => l.trim().length > 0);
      assert('Thread summary is approximately two lines', threadSummaryLines.length <= 3 && threadSummaryLines.length >= 1, { linesCount: threadSummaryLines.length });

      // Verify thread persistence
      const threadDetailRes = await fetch(`${BASE}/api/emails/${targetEmail.id}`);
      const threadDetailData = await threadDetailRes.json();
      console.log('Test 4 threadDetailData thread:', threadDetailData.thread?.summary);
      console.log('Test 4 summarizeData summary:', summarizeData.summary);
      assert('Thread summary persisted in Supabase', threadDetailData.thread?.summary === summarizeData.summary || threadDetailData.email?.summary === summarizeData.summary, {
        actualThread: threadDetailData.thread?.summary,
        actualEmail: threadDetailData.email?.summary,
        expected: summarizeData.summary
      });

      // -------------------------------------------------------------
      // Test 5: Batch AI Triage via POST /api/emails/analyze
      // -------------------------------------------------------------
      console.log('\n--- TEST 5: POST /api/emails/analyze (BATCH CONCURRENCY) ---');
      const batchRes = await fetch(`${BASE}/api/emails/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 6 })
      });
      const batchData = await batchRes.json();

      assert('Batch triage returns 200 OK', batchRes.status === 200);
      assert('Batch triage success: true', batchData.success === true);
      assert('Processed emails count > 0', batchData.processed > 0, { processed: batchData.processed });
      assert('Successful + fallback equals processed', (batchData.successful + batchData.fallback) === batchData.processed, {
        successful: batchData.successful,
        fallback: batchData.fallback,
        processed: batchData.processed
      });
      assert('Failed count is 0', batchData.failed === 0);

      // -------------------------------------------------------------
      // Test 6: Phase 1 & 2 Regressions
      // -------------------------------------------------------------
      console.log('\n--- TEST 6: REGRESSION VERIFICATION ---');
      const healthRes = await fetch(`${BASE}/health`);
      const healthData = await healthRes.json();
      assert('Health check reports Supabase connected', healthData.supabase?.available === true);
      assert('Health check reports Groq AI configured', healthData.ai?.provider === 'groq');

      const aiTestRes = await fetch(`${BASE}/api/ai/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: 'Team Sync', body: 'Let us meet tomorrow.' })
      });
      const aiTestData = await aiTestRes.json();
      assert('Phase 1 /api/ai/test succeeds', aiTestData.success === true && aiTestData.provider === 'groq');

      const listRes = await fetch(`${BASE}/api/emails`);
      const listData = await listRes.json();
      assert('GET /api/emails returns list', listData.success === true && Array.isArray(listData.emails));

      const singleRes = await fetch(`${BASE}/api/emails/${targetEmail.id}`);
      const singleData = await singleRes.json();
      console.log('Test 6 singleData:', singleData);
      assert('GET /api/emails/:id returns details with thread', singleData.success === true && singleData.email?.id === targetEmail.id, singleData);

      console.log(`\n================================================================`);
      console.log(`PHASE 3 RESULTS: ${passed} PASSED, ${failed} FAILED`);
      console.log(`================================================================\n`);

      server.close(() => {
        if (failed > 0) process.exit(1);
        else process.exit(0);
      });
    } catch (err) {
      console.error('Test execution failed:', err);
      server.close(() => process.exit(1));
    }
  });
}

runPhase3Tests();
