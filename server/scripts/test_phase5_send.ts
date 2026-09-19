import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import apiRouter from '../src/routes/api.js';
import { aiService } from '../src/services/ai.service.js';
import { store } from '../src/services/store.service.js';
import { checkSupabaseHealth, supabase } from '../src/config/supabase.js';
import { Draft, SentEmail } from '../src/types/index.js';

async function runPhase5Tests() {
  console.log('================================================================');
  console.log('🚀 PHASE 5 VERIFICATION: DRAFT EDITING + TONE SLIDER + SEND WORKFLOW');
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

  const TEST_PORT = 5895;
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
      // Test 0: Health & Configuration
      // -------------------------------------------------------------
      console.log('--- TEST 0: SYSTEM HEALTH & GROQ CASCADE STATUS ---');
      const healthRes = await fetch(`${BASE}/health`);
      const healthData = await healthRes.json();
      assert('Server health endpoint returns 200', healthRes.status === 200);
      assert('Supabase available in health check', healthData.supabase?.available === true);
      assert('AI provider is configured as Groq', healthData.ai?.provider?.toLowerCase() === 'groq');

      // -------------------------------------------------------------
      // Test 1: Draft Retrieval & Inbox Candidate Selection
      // -------------------------------------------------------------
      console.log('\n--- TEST 1: INBOX & DRAFT RETRIEVAL ---');
      const emailsRes = await fetch(`${BASE}/api/emails`);
      const emailsData = await emailsRes.json();
      assert('Inbox has emails available', Array.isArray(emailsData.emails) && emailsData.emails.length > 0);

      // Find an email that has not been sent yet
      const unsentEmail = emailsData.emails.find((e: any) => e.status !== 'sent');
      assert('Found unsent candidate email for drafting', !!unsentEmail);
      const testEmail = unsentEmail || emailsData.emails[0];

      // -------------------------------------------------------------
      // Test 2: Tone Slider Parameter Reaching Draft Generation (Tone 1 Casual vs Tone 5 Formal)
      // -------------------------------------------------------------
      console.log('\n--- TEST 2: TONE SLIDER PARAMETER (1 = CASUAL, 5 = FORMAL) ---');
      console.log('Generating Level 1 (Casual) reply draft...');
      const casualRes = await fetch(`${BASE}/api/emails/${testEmail.id}/generate-reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tone: 1 })
      });
      const casualData = await casualRes.json();
      assert('Tone 1 generation returns 200 OK', casualRes.status === 200);
      assert('Tone 1 draft generated', !!casualData.draft);
      assert('Tone 1 draft records toneUsed = 1', casualData.toneUsed === 1);

      const casualContent = casualData.draft.content.toLowerCase();
      const isCasualGreeting = casualContent.includes('hey') || casualContent.includes('hi') || casualContent.includes('thanks');
      const isCasualSignoff = casualContent.includes('best') || casualContent.includes('thanks') || casualContent.includes('sai');
      assert('Tone 1 draft exhibits casual tone traits', isCasualGreeting && isCasualSignoff, { content: casualData.draft.content.slice(0, 100) });

      console.log('Generating Level 5 (Highly Formal) reply draft...');
      const formalRes = await fetch(`${BASE}/api/emails/${testEmail.id}/generate-reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tone: 5 })
      });
      const formalData = await formalRes.json();
      assert('Tone 5 generation returns 200 OK', formalRes.status === 200);
      assert('Tone 5 draft records toneUsed = 5', formalData.toneUsed === 5);

      const formalContent = formalData.draft.content.toLowerCase();
      const isFormalGreeting = formalContent.includes('dear') || formalContent.includes('hi');
      const isFormalSignoff = formalContent.includes('sincerely') || formalContent.includes('regards');
      assert('Tone 5 draft exhibits formal tone traits', isFormalGreeting || isFormalSignoff, { content: formalData.draft.content.slice(0, 100) });

      // -------------------------------------------------------------
      // Test 3: Regeneration Action (POST /api/drafts/:id/regenerate)
      // -------------------------------------------------------------
      console.log('\n--- TEST 3: DRAFT REGENERATION ENDPOINT (POST /api/drafts/:id/regenerate) ---');
      const regenRes = await fetch(`${BASE}/api/drafts/${casualData.draft.id}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tone: 4 })
      });
      const regenData = await regenRes.json();
      assert('Regenerate endpoint returns 200 OK', regenRes.status === 200);
      assert('Regenerated draft returned', !!regenData.draft);
      assert('Regenerated draft records toneUsed = 4', regenData.toneUsed === 4);
      assert('Draft status remains "draft" after regeneration', regenData.draft.status === 'draft');

      // -------------------------------------------------------------
      // Test 4: Subject and Body Editing via PUT /api/drafts/:id
      // -------------------------------------------------------------
      console.log('\n--- TEST 4: SUBJECT AND BODY EDITING (PUT /api/drafts/:id) ---');
      const customSubject = `Re: [Customized Urgent Update] ${testEmail.subject}`;
      const customBody = `Hi ${testEmail.sender_name || 'there'},\n\nI have reviewed the proposal and approved the revised timeline.\n\nBest regards,\nSai`;

      const editRes = await fetch(`${BASE}/api/drafts/${regenData.draft.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email_id: testEmail.id,
          subject: customSubject,
          content: customBody,
          tone: 4
        })
      });
      const editData = await editRes.json();
      assert('PUT /api/drafts/:id returns 200 OK', editRes.status === 200);
      assert('Draft content updated with custom body', editData.draft?.content === customBody);
      assert('Draft subject updated with custom subject', editData.draft?.subject === customSubject);
      assert('Draft status remains "draft"', editData.draft?.status === 'draft');

      // Verify persistence via store
      const persistedDraft = await store.getDraftByEmailId(testEmail.id);
      assert('Persisted draft has updated content', persistedDraft?.content === customBody);
      assert('Persisted draft has updated subject', persistedDraft?.subject === customSubject);

      // -------------------------------------------------------------
      // Test 5: Empty Draft Validation
      // -------------------------------------------------------------
      console.log('\n--- TEST 5: EMPTY DRAFT CONTENT VALIDATION ---');
      const emptySendRes = await fetch(`${BASE}/api/drafts/${testEmail.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email_id: testEmail.id,
          content: '   ',
          subject: customSubject
        })
      });
      assert('Empty draft send rejected with 400', emptySendRes.status === 400);
      const emptySendData = await emptySendRes.json();
      assert('Empty draft error message contains validation feedback', emptySendData.error?.toLowerCase().includes('empty'));

      // -------------------------------------------------------------
      // Test 6: Approve & Send Execution
      // -------------------------------------------------------------
      console.log('\n--- TEST 6: APPROVE & SEND WORKFLOW (POST /api/drafts/:id/send) ---');
      const sendRes = await fetch(`${BASE}/api/drafts/${testEmail.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email_id: testEmail.id,
          content: customBody,
          subject: customSubject
        })
      });
      const sendData = await sendRes.json();
      assert('Approve & Send returns 200 OK', sendRes.status === 200);
      assert('Send response success is true', sendData.success === true);
      assert('Send response contains sentEmail object', !!sendData.sentEmail);

      const sentEmail: SentEmail = sendData.sentEmail;
      assert('Sent email has correct recipient', sentEmail.recipient === testEmail.sender);
      assert('Sent email has custom subject', sentEmail.subject === customSubject);
      assert('Sent email has custom body', sentEmail.body === customBody);
      assert('Sent email has timestamp', typeof sentEmail.sent_at === 'string');
      assert('Sent email has status "Sent"', sentEmail.status === 'Sent');

      // -------------------------------------------------------------
      // Test 7: Sent Email Persistence in Supabase sent_emails
      // -------------------------------------------------------------
      console.log('\n--- TEST 7: SUPABASE SENT_EMAILS PERSISTENCE ---');
      const sentList = await store.getSentEmails();
      const foundInSent = sentList.find(s => s.id === sentEmail.id || s.original_email_id === testEmail.id);
      assert('Sent message persisted in Supabase sent_emails', !!foundInSent);
      assert('Persisted sent email matches subject', foundInSent?.subject === customSubject);

      // -------------------------------------------------------------
      // Test 8: Draft Status Transition
      // -------------------------------------------------------------
      console.log('\n--- TEST 8: DRAFT STATUS TRANSITION ---');
      // The draft should now have status = 'sent', so it shouldn't show up in active drafts
      const activeDrafts = await store.getDrafts();
      const stillActiveDraft = activeDrafts.find(d => d.email_id === testEmail.id);
      assert('Draft no longer appears in pending drafts list', !stillActiveDraft);

      // Email status should now be 'sent'
      const updatedEmail = await store.getEmailById(testEmail.id);
      assert('Original email status updated to "sent"', updatedEmail?.status === 'sent');

      // -------------------------------------------------------------
      // Test 9: Duplicate-Send Prevention
      // -------------------------------------------------------------
      console.log('\n--- TEST 9: DUPLICATE-SEND PREVENTION ---');
      const duplicateSendRes = await fetch(`${BASE}/api/drafts/${testEmail.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email_id: testEmail.id,
          content: customBody,
          subject: customSubject
        })
      });
      assert('Duplicate send attempt is rejected with 400', duplicateSendRes.status === 400);
      const duplicateData = await duplicateSendRes.json();
      assert('Duplicate send returns clear error feedback', duplicateData.error?.toLowerCase().includes('already been sent'));

      // -------------------------------------------------------------
      // Test 10: Sent Page Retrieval (GET /api/sent)
      // -------------------------------------------------------------
      console.log('\n--- TEST 10: GET /api/sent MAILBOX ENDPOINT ---');
      const getSentRes = await fetch(`${BASE}/api/sent`);
      const getSentData = await getSentRes.json();
      assert('GET /api/sent returns 200 OK', getSentRes.status === 200);
      assert('GET /api/sent returns array of sent emails', Array.isArray(getSentData.sent) && getSentData.sent.length > 0);
      const inSentBox = getSentData.sent.find((s: any) => s.id === sentEmail.id || s.original_email_id === testEmail.id);
      assert('Newly sent reply is present in Sent mailbox', !!inSentBox);

      // -------------------------------------------------------------
      // Test 11: Regression Verification (Phases 1-4)
      // -------------------------------------------------------------
      console.log('\n--- TEST 11: REGRESSION VERIFICATION (PHASES 1-4) ---');
      // Style profile (Phase 4)
      const styleRes = await fetch(`${BASE}/api/style`);
      const styleData = await styleRes.json();
      assert('Style profile retrieval returns 200 (Phase 4)', styleRes.status === 200 && !!styleData.profile?.tone);

      // Stats check
      const statsRes = await fetch(`${BASE}/api/stats`);
      const statsData = await statsRes.json();
      const stats = statsData.stats || statsData;
      assert('Dashboard stats endpoint returns 200', statsRes.status === 200);
      assert('Sent emails count incremented in stats', typeof stats.sentCount === 'number' && stats.sentCount >= 1, { sentCount: stats.sentCount });

      // Final score
      console.log('\n================================================================');
      console.log(`🏁 PHASE 5 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
      console.log('================================================================');

      if (failed > 0) {
        process.exitCode = 1;
      }
    } catch (err: any) {
      console.error('Unhandled error during test run:', err);
      process.exitCode = 1;
    } finally {
      server.close(() => {
        console.log('Test server closed.');
        process.exit(process.exitCode || 0);
      });
    }
  });
}

runPhase5Tests();
