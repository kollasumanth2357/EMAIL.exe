import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import apiRoutes from '../src/routes/api.js';
import { importService } from '../src/services/import.service.js';
import { store } from '../src/services/store.service.js';
import { checkSupabaseHealth, supabase } from '../src/config/supabase.js';

import { aiService } from '../src/services/ai.service.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', apiRoutes);

app.get('/health', async (req, res) => {
  const supabaseHealth = await checkSupabaseHealth();
  const aiStatus = aiService.getAIStatus();

  res.json({
    status: 'healthy',
    product: 'MailPilot — AI Email Inbox Triage & Draft Assistant',
    timestamp: new Date().toISOString(),
    supabase: {
      status: supabaseHealth.available ? 'connected' : 'error_or_fallback',
      available: supabaseHealth.available,
      ...(supabaseHealth.error ? { error: supabaseHealth.error } : {})
    },
    ai: {
      provider: aiStatus.provider,
      model: aiStatus.model,
      configured: aiStatus.configured
    }
  });
});

async function runPhase2Tests() {
  console.log('================================================================');
  console.log('🚀 PHASE 2 VERIFICATION: ENRON IMPORT & NORMALIZATION PIPELINE');
  console.log('================================================================\n');

  const PORT = 5892;
  const server = app.listen(PORT, async () => {
    console.log(`Test server running on port ${PORT}`);
    const BASE = `http://localhost:${PORT}`;

    let passed = 0;
    let failed = 0;

    function assert(name: string, condition: boolean, extra?: any) {
      if (condition) {
        console.log(`✅ PASS: ${name}${extra !== undefined ? ` (${JSON.stringify(extra)})` : ''}`);
        passed++;
      } else {
        console.error(`❌ FAIL: ${name}${extra !== undefined ? ` (${JSON.stringify(extra)})` : ''}`);
        failed++;
      }
    }

    try {
      // -------------------------------------------------------------
      // Test 1: Unit Test RFC 822 Parser
      // -------------------------------------------------------------
      console.log('--- TEST 1: ENRON RFC 822 RAW PARSER ---');
      const sampleRFC822 = `Message-ID: <12345.67890.JavaMail.evans@thyme>
Date: Mon, 2 Oct 2000 02:19:00 -0700 (PDT)
From: phillip.allen@enron.com
To: ina.rangel@enron.com
Subject: Re: Storage Strategies in the West
X-From: Phillip K Allen <phillip.allen@enron.com>
X-To: Ina Rangel <ina.rangel@enron.com>

There will be a meeting on Tuesday, Oct. 10th at 4:00pm in EB3270 regarding
Storage Strategies in the West. Please mark your calendars.

-----Original Message-----
From: Prior sender
Old discussion content here...`;

      const parsed = importService.parseRFC822(sampleRFC822, 'allen-p/all_documents/109.');
      assert('RFC 822 parser extracted record', parsed !== null);
      assert('Sender extracted and cleaned', parsed?.sender === 'phillip.allen@mailpilot.demo', parsed?.sender);
      assert('Sender name extracted', parsed?.senderName === 'Phillip K Allen', parsed?.senderName);
      assert('Normalized subject strips Re:', parsed?.normalizedSubject === 'Storage Strategies in the West', parsed?.normalizedSubject);
      assert('Forwarded message clutter stripped', !parsed?.body.includes('-----Original Message-----'));
      assert('Deterministic ID generated', parsed?.id?.startsWith('enron_'), parsed?.id);

      // -------------------------------------------------------------
      // Test 2: Unit Test Subject Normalization
      // -------------------------------------------------------------
      console.log('\n--- TEST 2: SUBJECT PREFIX NORMALIZATION ---');
      assert('Strips Re:', importService.normalizeSubject('Re: Gas Trading Vision') === 'Gas Trading Vision');
      assert('Strips RE:', importService.normalizeSubject('RE: Gas Trading Vision') === 'Gas Trading Vision');
      assert('Strips Fwd:', importService.normalizeSubject('Fwd: Gas Trading Vision') === 'Gas Trading Vision');
      assert('Strips nested Re: Fwd:', importService.normalizeSubject('Re: Fwd: Gas Trading Vision') === 'Gas Trading Vision');

      // -------------------------------------------------------------
      // Test 3: POST /api/import/enron-sample
      // -------------------------------------------------------------
      console.log('\n--- TEST 3: POST /api/import/enron-sample ---');
      const enronSampleRes = await fetch(`${BASE}/api/import/enron-sample`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 40 })
      });
      const enronSampleData = await enronSampleRes.json();

      assert('Enron sample import returns 200 OK', enronSampleRes.status === 200);
      assert('Enron sample returned success: true', enronSampleData.success === true);
      assert('Enron sample processed emails', (enronSampleData.stats?.imported > 0 || enronSampleData.stats?.duplicates > 0), enronSampleData.stats);
      assert('Inbox emails separated', (enronSampleData.stats?.inbox > 0 || enronSampleData.stats?.duplicates > 0));
      assert('Sent emails separated', (enronSampleData.stats?.sent > 0 || enronSampleData.stats?.duplicates > 0));
      assert('Threads grouped', enronSampleData.stats?.threads > 0);

      // -------------------------------------------------------------
      // Test 4: Duplicate Protection
      // -------------------------------------------------------------
      console.log('\n--- TEST 4: DUPLICATE PROTECTION ---');
      // Import the exact same Enron sample again
      const dupRes = await fetch(`${BASE}/api/import/enron-sample`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 40 })
      });
      const dupData = await dupRes.json();
      assert('Second import detects duplicates', dupData.stats?.duplicates > 0, { duplicates: dupData.stats?.duplicates });
      assert('Zero duplicate additions', dupData.stats?.imported === 0);

      // -------------------------------------------------------------
      // Test 5: Generic CSV Upload via POST /api/import
      // -------------------------------------------------------------
      console.log('\n--- TEST 5: GENERIC CSV IMPORT VIA POST /api/import ---');
      const csvContent = `sender,recipient,subject,body,timestamp
jordan@techcorp.io,sai@mailpilot.demo,"Architecture Review for FastSync","Hi Sai, can we schedule 30 mins to review the caching pipeline?","2026-09-18T15:00:00.000Z"
jordan@techcorp.io,sai@mailpilot.demo,"Re: Architecture Review for FastSync","Follow up: I prepared the architecture diagram for review.","2026-09-18T16:30:00.000Z"`;

      // Upload via FormData multipart
      const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
      const bodyPayload = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="file"; filename="sample_emails.csv"',
        'Content-Type: text/csv',
        '',
        csvContent,
        `--${boundary}--`
      ].join('\r\n');

      const csvRes = await fetch(`${BASE}/api/import`, {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`
        },
        body: bodyPayload
      });
      const csvData = await csvRes.json();
      console.log('CSV Import Result:', csvData);
      assert('POST /api/import returns 200 OK', csvRes.status === 200);
      assert('CSV import returned success: true', csvData.success === true);
      assert('Both emails grouped under 1 thread ("Architecture Review for FastSync")', csvData.stats?.threads === 1);

      // -------------------------------------------------------------
      // Test 6: Verify Database Query Endpoints
      // -------------------------------------------------------------
      console.log('\n--- TEST 6: VERIFY INBOX AND SENT RETRIEVAL ---');
      const emailsRes = await fetch(`${BASE}/api/emails`);
      const emailsData = await emailsRes.json();
      assert('GET /api/emails returns non-empty list', emailsData.success && emailsData.emails?.length > 0, { count: emailsData.emails?.length });

      const sentRes = await fetch(`${BASE}/api/sent`);
      const sentData = await sentRes.json();
      assert('GET /api/sent returns non-empty list', sentData.success && sentData.sent?.length > 0, { count: sentData.sent?.length });

      // Verify thread messages on an email
      const sampleEmail = emailsData.emails.find((e: any) => e.messages && e.messages.length > 1) || emailsData.emails[0];
      const detailRes = await fetch(`${BASE}/api/emails/${sampleEmail.id}`);
      const detailData = await detailRes.json();
      assert('GET /api/emails/:id includes thread data', detailData.success && detailData.thread?.id !== undefined);

      // -------------------------------------------------------------
      // Test 7: Verify Phase 1 Endpoints Unbroken
      // -------------------------------------------------------------
      console.log('\n--- TEST 7: PHASE 1 REGRESSION CHECKS ---');
      const healthRes = await fetch(`${BASE}/health`);
      const healthData = await healthRes.json();
      assert('Health check reports Supabase connected', healthData.supabase?.available === true);
      assert('Health check reports Groq AI configured', healthData.ai?.provider === 'groq' && healthData.ai?.model === 'llama-3.3-70b-versatile');

      const aiTestRes = await fetch(`${BASE}/api/ai/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: 'Check server logs', body: 'Please verify server metrics.' })
      });
      const aiTestData = await aiTestRes.json();
      assert('POST /api/ai/test succeeds', aiTestData.success && aiTestData.provider === 'groq');

      console.log(`\n================================================================`);
      console.log(`PHASE 2 RESULTS: ${passed} PASSED, ${failed} FAILED`);
      console.log(`================================================================\n`);

      server.close(() => {
        if (failed > 0) process.exit(1);
        else process.exit(0);
      });
    } catch (err) {
      console.error('Test execution error:', err);
      server.close(() => process.exit(1));
    }
  });
}

runPhase2Tests();
