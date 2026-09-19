import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import apiRouter from '../src/routes/api.js';
import { aiService } from '../src/services/ai.service.js';
import { store } from '../src/services/store.service.js';
import { checkSupabaseHealth, supabase } from '../src/config/supabase.js';
import { Draft, SentEmail, Email, DetailedAnalytics, GmailStatus } from '../src/types/index.js';

async function runPhase6Tests() {
  console.log('================================================================');
  console.log('🚀 PHASE 6 VERIFICATION: BULK ACTIONS + ANALYTICS + GMAIL DEMO');
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

  const TEST_PORT = 5896;
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
      // TEST 0: SYSTEM HEALTH & GROQ CASCADE STATUS
      // -------------------------------------------------------------
      console.log('--- TEST 0: SYSTEM HEALTH & GROQ CASCADE STATUS ---');
      const healthRes = await fetch(`${BASE}/health`);
      const healthData = await healthRes.json();

      assert('Server health endpoint returns 200', healthRes.status === 200);
      assert('Supabase available in health check', healthData.supabase.available === true);
      assert('AI provider is configured as Groq', healthData.ai.provider === 'groq');

      // -------------------------------------------------------------
      // TEST 1: BULK SELECTION & BULK AI TRIAGE
      // -------------------------------------------------------------
      console.log('\n--- TEST 1: BULK SELECTION & BULK AI TRIAGE (POST /api/emails/bulk-triage) ---');
      const emailsRes = await fetch(`${BASE}/api/emails`);
      const emailsData = await emailsRes.json();
      assert('Emails endpoint returns 200', emailsRes.status === 200);
      assert('Inbox has emails available for bulk testing', emailsData.emails.length >= 2);

      const targetEmails = emailsData.emails.slice(0, 2);
      const targetIds = targetEmails.map((e: Email) => e.id);

      // 1a. Validate empty array rejection
      const emptyRes = await fetch(`${BASE}/api/emails/bulk-triage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_ids: [] })
      });
      assert('Empty email_ids array rejected with 400', emptyRes.status === 400);

      // 1b. Execute bulk AI triage
      console.log(`Executing bulk triage for 2 emails (${targetIds.join(', ')})...`);
      const bulkTriageRes = await fetch(`${BASE}/api/emails/bulk-triage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_ids: targetIds })
      });
      const bulkTriageData = await bulkTriageRes.json();

      assert('Bulk triage returns 200 OK', bulkTriageRes.status === 200);
      assert('Bulk triage reports success = true', bulkTriageData.success === true);
      assert('Bulk triage processed correct count', bulkTriageData.processed === 2);
      assert('Bulk triage completed with zero unhandled failures', bulkTriageData.failed === 0);

      // 1c. Verify individual records were updated
      const updatedEmail1 = await store.getEmailById(targetIds[0]);
      assert('Target email 1 has valid priority assigned', ['Urgent', 'Normal', 'Low'].includes(updatedEmail1?.priority || ''));
      assert('Target email 1 has valid topic assigned', Boolean(updatedEmail1?.topic));
      assert('Target email 1 has AI summary assigned', Boolean(updatedEmail1?.summary && updatedEmail1.summary.length > 0));

      // -------------------------------------------------------------
      // TEST 2: BULK STATUS & READ/UNREAD UPDATES
      // -------------------------------------------------------------
      console.log('\n--- TEST 2: BULK STATUS UPDATES (POST /api/emails/bulk-status) ---');

      // 2a. Mark both as read
      const markReadRes = await fetch(`${BASE}/api/emails/bulk-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_ids: targetIds, is_read: true })
      });
      const markReadData = await markReadRes.json();

      assert('Bulk mark read returns 200 OK', markReadRes.status === 200);
      assert('Bulk mark read reports updatedCount = 2', markReadData.updatedCount === 2);

      const checkRead1 = await store.getEmailById(targetIds[0]);
      const checkRead2 = await store.getEmailById(targetIds[1]);
      assert('Email 1 is marked as read', checkRead1?.is_read === true);
      assert('Email 2 is marked as read', checkRead2?.is_read === true);

      // 2b. Mark email 1 as unread
      const markUnreadRes = await fetch(`${BASE}/api/emails/bulk-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_ids: [targetIds[0]], is_read: false })
      });
      assert('Bulk mark unread returns 200 OK', markUnreadRes.status === 200);

      const checkUnread1 = await store.getEmailById(targetIds[0], false);
      assert('Email 1 is toggled back to unread', checkUnread1?.is_read === false);

      // -------------------------------------------------------------
      // TEST 3: COMPREHENSIVE DATA-DRIVEN ANALYTICS
      // -------------------------------------------------------------
      console.log('\n--- TEST 3: DATA-DRIVEN ANALYTICS (GET /api/analytics & GET /api/stats) ---');
      const analyticsRes = await fetch(`${BASE}/api/analytics`);
      const analyticsPayload = await analyticsRes.json();

      assert('Analytics endpoint returns 200 OK', analyticsRes.status === 200);
      assert('Analytics payload success is true', analyticsPayload.success === true);

      const a: DetailedAnalytics = analyticsPayload.analytics;
      assert('Analytics total matches email count', typeof a.total === 'number' && a.total > 0, { total: a.total });
      assert('Analytics contains priority counts', typeof a.urgent === 'number' && typeof a.normal === 'number' && typeof a.low === 'number');
      assert('Priority counts sum up to total', (a.urgent + a.normal + a.low) === a.total);

      assert('Analytics contains priority distribution with percentages',
        typeof a.priorityDistribution?.urgent?.percentage === 'number' &&
        typeof a.priorityDistribution?.normal?.percentage === 'number' &&
        typeof a.priorityDistribution?.low?.percentage === 'number'
      );

      assert('Analytics contains topic distribution',
        Boolean(a.topicDistribution?.work) &&
        Boolean(a.topicDistribution?.actionRequired) &&
        Boolean(a.topicDistribution?.personal)
      );

      assert('Analytics tracks triage progress',
        typeof a.triageProgress?.percentage === 'number' &&
        a.triageProgress.total === a.total &&
        a.triageProgress.triaged >= 0
      );

      assert('Analytics calculates estimatedMinutesSaved',
        typeof a.estimatedMinutesSaved === 'number' && a.estimatedMinutesSaved > 0,
        { estimatedMinutesSaved: a.estimatedMinutesSaved }
      );

      assert('Analytics mailboxHealth tracks responseRatePercentage',
        typeof a.mailboxHealth?.responseRatePercentage === 'number'
      );

      // -------------------------------------------------------------
      // TEST 4: GMAIL READ-ONLY DEMO SANDBOX INTEGRATION
      // -------------------------------------------------------------
      console.log('\n--- TEST 4: GMAIL READ-ONLY DEMO SANDBOX INTEGRATION ---');

      // 4a. Initial Status
      const gmailStatusRes = await fetch(`${BASE}/api/gmail/status`);
      const gmailStatusData = await gmailStatusRes.json();

      assert('GET /api/gmail/status returns 200 OK', gmailStatusRes.status === 200);
      assert('Gmail status reports mode = "demo"', gmailStatusData.mode === 'demo');
      assert('Gmail status reports read-only scope', gmailStatusData.scopes.includes('https://www.googleapis.com/auth/gmail.readonly'));
      assert('Gmail status indicates missing OAuth credentials in safe sandbox', gmailStatusData.configured === false);

      // 4b. Connect Demo Account
      const connectRes = await fetch(`${BASE}/api/gmail/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountEmail: 'alex.morgan@gmail.com' })
      });
      const connectData = await connectRes.json();

      assert('POST /api/gmail/connect returns 200 OK', connectRes.status === 200);
      assert('Connected status is true', connectData.connected === true);
      assert('Connected email is alex.morgan@gmail.com', connectData.accountEmail === 'alex.morgan@gmail.com');

      // 4c. Sync Sandbox Inbox (passes through import & RFC 822 thread normalization pipeline)
      console.log('Syncing Gmail sandbox messages through thread pipeline...');
      const syncRes = await fetch(`${BASE}/api/gmail/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const syncData = await syncRes.json();

      assert('POST /api/gmail/sync returns 200 OK', syncRes.status === 200);
      assert('Sync returns imported count >= 4', syncData.stats.imported >= 4, { imported: syncData.stats.imported });
      assert('Sync created threads', syncData.stats.threads >= 1, { threads: syncData.stats.threads });
      assert('Gmail status recorded lastSync timestamp', Boolean(syncData.gmailStatus.lastSync));

      // 4d. Disconnect Demo Account
      const disconnectRes = await fetch(`${BASE}/api/gmail/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const disconnectData = await disconnectRes.json();

      assert('POST /api/gmail/disconnect returns 200 OK', disconnectRes.status === 200);
      assert('Disconnected status is false', disconnectData.connected === false);

      // -------------------------------------------------------------
      // TEST 5: UNIFIED SETTINGS ENDPOINT
      // -------------------------------------------------------------
      console.log('\n--- TEST 5: UNIFIED SETTINGS ENDPOINT (GET /api/settings) ---');
      const settingsRes = await fetch(`${BASE}/api/settings`);
      const settingsData = await settingsRes.json();

      assert('GET /api/settings returns 200 OK', settingsRes.status === 200);
      assert('Settings includes database configuration', settingsData.database.provider === 'Supabase PostgreSQL');
      assert('Settings includes AI model information', settingsData.ai.primaryModel === 'llama-3.3-70b-versatile');
      assert('Settings includes Gmail demo integration status', Boolean(settingsData.gmail));
      assert('Settings includes learned writing style summary', Boolean(settingsData.style?.tone));
      assert('Settings includes 5-level tone scale reference', Array.isArray(settingsData.toneScale) && settingsData.toneScale.length === 5);

      // -------------------------------------------------------------
      // TEST 6: REGRESSION - PHASE 5 SEND WORKFLOW & DUPLICATE PROTECTION
      // -------------------------------------------------------------
      console.log('\n--- TEST 6: REGRESSION - PHASE 5 SEND WORKFLOW & DUPLICATE PREVENTION ---');
      const freshEmails = await store.getEmails({ status: 'inbox' });
      const candidateEmail = freshEmails.find(e => e.status !== 'sent');
      assert('Found unsent candidate email for Phase 5 regression', Boolean(candidateEmail));

      if (candidateEmail) {
        // Generate draft with tone 3
        const draftRes = await fetch(`${BASE}/api/emails/${candidateEmail.id}/generate-reply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tone: 3 })
        });
        const draftData = await draftRes.json();
        assert('Draft generation returns 200 OK', draftRes.status === 200);
        assert('Draft generated for candidate', Boolean(draftData.draft?.id));

        // Send draft
        const sendRes = await fetch(`${BASE}/api/drafts/${candidateEmail.id}/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email_id: candidateEmail.id,
            content: 'Hi,\n\nThanks for reaching out. Let us proceed with the review.\n\nRegards,\nSai',
            subject: 'Re: Final Review Confirmation'
          })
        });
        const sendData = await sendRes.json();
        assert('Send reply returns 200 OK', sendRes.status === 200);
        assert('Sent email has status "Sent"', sendData.sentEmail?.status === 'Sent');

        // Duplicate send rejection
        const dupRes = await fetch(`${BASE}/api/drafts/${candidateEmail.id}/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email_id: candidateEmail.id, content: 'Duplicate send' })
        });
        assert('Duplicate send is blocked with 400', dupRes.status === 400);

        // Check sent mailbox
        const sentRes = await fetch(`${BASE}/api/sent`);
        const sentData = await sentRes.json();
        assert('Sent mailbox returns 200 OK', sentRes.status === 200);
        assert('Sent mailbox contains the dispatched message',
          sentData.sent.some((s: SentEmail) => s.original_email_id === candidateEmail.id)
        );
      }

      // -------------------------------------------------------------
      // TEST 7: REGRESSION - PHASE 4 TONE LEARNING
      // -------------------------------------------------------------
      console.log('\n--- TEST 7: REGRESSION - PHASE 4 WRITING STYLE LEARNING ---');
      const styleRes = await fetch(`${BASE}/api/style`);
      const styleData = await styleRes.json();
      assert('GET /api/style returns 200 OK', styleRes.status === 200);
      assert('Style profile has tone string', Boolean(styleData.profile?.tone));
      assert('Style profile has preferred greeting', Boolean(styleData.profile?.greeting));
      assert('Style profile has preferred sign-off', Boolean(styleData.profile?.signoff));

      // -------------------------------------------------------------
      // TEST 8: REGRESSION - PHASE 3 AI EMAIL TRIAGE
      // -------------------------------------------------------------
      console.log('\n--- TEST 8: REGRESSION - PHASE 3 AI EMAIL TRIAGE ---');
      const triageSingleRes = await fetch(`${BASE}/api/emails/${targetIds[0]}/triage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      assert('Single email triage returns 200 OK', triageSingleRes.status === 200);

      // -------------------------------------------------------------
      // TEST 9: REGRESSION - PHASE 2 IMPORTED DATASETS & THREADS
      // -------------------------------------------------------------
      console.log('\n--- TEST 9: REGRESSION - PHASE 2 IMPORTED THREADS ---');
      const threads = await store.getThreads();
      assert('Thread store contains active conversation threads', threads.length > 0, { threadCount: threads.length });

    } catch (err: any) {
      console.error('Fatal test exception:', err);
      failed++;
    } finally {
      console.log('\n================================================================');
      console.log(`🏁 PHASE 6 FINAL SUMMARY: ${passed} PASSED, ${failed} FAILED (${failed === 0 ? '100% PASS RATE' : 'FAILURE DETECTED'})`);
      console.log('================================================================\n');
      server.close();
      process.exit(failed > 0 ? 1 : 0);
    }
  });
}

runPhase6Tests();
