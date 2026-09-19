import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import apiRoutes from '../src/routes/api.js';
import { checkSupabaseHealth } from '../src/config/supabase.js';
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

async function runTests() {
  const PORT = 5891;
  const server = app.listen(PORT, async () => {
    console.log('Test server listening on port ' + PORT);
    const BASE = 'http://localhost:' + PORT;

    let passed = 0;
    let failed = 0;

    function check(desc: string, cond: boolean, extra?: any) {
      if (cond) {
        console.log('✅ ' + desc + (extra ? ' (' + JSON.stringify(extra) + ')' : ''));
        passed++;
      } else {
        console.error('❌ ' + desc + (extra ? ' (' + JSON.stringify(extra) + ')' : ''));
        failed++;
      }
    }

    try {
      // 1. Health check
      const hRes = await fetch(BASE + '/health');
      const hData = await hRes.json();
      check('Health check returns 200 OK', hRes.status === 200);
      check('Health check reports Supabase status', hData.supabase && hData.supabase.available === true, hData.supabase);
      check('Health check reports Groq AI status', hData.ai && hData.ai.provider === 'groq' && hData.ai.model === 'llama-3.3-70b-versatile', hData.ai);

      // 2. AI test endpoint
      const aiRes = await fetch(BASE + '/api/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: 'URGENT: Kubernetes worker nodes crashing',
          body: 'Three nodes went NotReady in cluster eu-west-1. Pods are evicting.'
        })
      });
      const aiData = await aiRes.json();
      check('POST /api/ai/test returns 200 OK', aiRes.status === 200);
      check('AI test reports provider "groq"', aiData.provider === 'groq');
      check('AI test reports model "llama-3.3-70b-versatile"', aiData.model === 'llama-3.3-70b-versatile');
      check('AI test returns Urgent priority', aiData.classification?.priority === 'Urgent', aiData.classification);
      check('AI test returns Action Required/Work topic', ['Action Required', 'Work'].includes(aiData.classification?.topic));
      check('AI test returns valid summary', typeof aiData.classification?.summary === 'string');

      // 3. GET /api/emails
      const eRes = await fetch(BASE + '/api/emails');
      const eData = await eRes.json();
      check('GET /api/emails returns success and email list', eData.success && Array.isArray(eData.emails), { count: eData.emails?.length });

      // 4. GET /api/emails/:id
      const e1Res = await fetch(BASE + '/api/emails/email_01');
      const e1Data = await e1Res.json();
      check('GET /api/emails/email_01 returns email and thread context', e1Data.success && e1Data.email && e1Data.thread);

      // 5. POST /api/drafts/:id/save
      const dSaveRes = await fetch(BASE + '/api/drafts/email_01/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email_id: 'email_01',
          content: 'Hi Prof. Kumar,\n\nWe have verified our test suite and will submit by Friday afternoon.\n\nRegards,\nSai'
        })
      });
      const dSaveData = await dSaveRes.json();
      check('POST /api/drafts/email_01/save returns saved draft', dSaveData.success && dSaveData.draft?.content?.includes('Friday'));

      // 6. POST /api/drafts/:id/send (Simulated Approve & Send)
      const dSendRes = await fetch(BASE + '/api/drafts/email_01/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email_id: 'email_01',
          content: 'Hi Prof. Kumar,\n\nWe have verified our test suite and will submit by Friday afternoon.\n\nRegards,\nSai'
        })
      });
      const dSendData = await dSendRes.json();
      check('POST /api/drafts/email_01/send returns success and sentEmail', dSendData.success && dSendData.sentEmail?.status === 'Sent');

      // 7. GET /api/sent
      const sRes = await fetch(BASE + '/api/sent');
      const sData = await sRes.json();
      check('GET /api/sent returns sent emails', sData.success && Array.isArray(sData.sent));

      // 8. GET /api/stats
      const stRes = await fetch(BASE + '/api/stats');
      const stData = await stRes.json();
      check('GET /api/stats returns analytics statistics', stData.success && typeof stData.stats?.total === 'number');

      console.log(`\nEndpoint Tests Complete: ${passed} passed, ${failed} failed.`);
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

runTests();
