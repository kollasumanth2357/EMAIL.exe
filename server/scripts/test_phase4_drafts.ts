import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import apiRouter from '../src/routes/api.js';
import { aiService } from '../src/services/ai.service.js';
import { store } from '../src/services/store.service.js';
import { checkSupabaseHealth, supabase } from '../src/config/supabase.js';
import { Draft, UserStyleProfile } from '../src/types/index.js';

async function runPhase4Tests() {
  console.log('================================================================');
  console.log('🚀 PHASE 4 VERIFICATION: TONE LEARNING & PERSONALIZED DRAFTS');
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

  const TEST_PORT = 5894;
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
      console.log('Health endpoint response:', JSON.stringify(healthData, null, 2));
      assert('Server health endpoint returns 200', healthRes.status === 200);
      assert('Supabase available in health check', healthData.supabase?.available === true);
      assert('AI provider is configured as Groq', healthData.ai?.provider?.toLowerCase() === 'groq');
      assert('AI primary model is llama-3.3-70b-versatile', healthData.ai?.primaryModel === 'llama-3.3-70b-versatile');
      assert('AI fallback model is openai/gpt-oss-120b', healthData.ai?.fallbackModel === 'openai/gpt-oss-120b');

      // -------------------------------------------------------------
      // Test 1: Style Learning (POST /api/style/learn)
      // -------------------------------------------------------------
      console.log('\n--- TEST 1: WRITING STYLE PROFILE SYNTHESIS (POST /api/style/learn) ---');
      const learnRes = await fetch(`${BASE}/api/style/learn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const learnData = await learnRes.json();
      assert('Style learning returns 200 OK', learnRes.status === 200);
      assert('Response contains style profile', !!learnData.profile);

      const profile: UserStyleProfile = learnData.profile;
      assert('Profile contains tone string', typeof profile.tone === 'string' && profile.tone.length > 0, { tone: profile.tone });
      assert('Profile contains formality level', typeof profile.formality === 'string' && profile.formality.length > 0, { formality: profile.formality });
      assert('Profile contains sentence length description', typeof profile.sentence_length === 'string' && profile.sentence_length.length > 0, { length: profile.sentence_length });
      assert('Profile contains preferred greeting', typeof profile.greeting === 'string' && profile.greeting.length > 0, { greeting: profile.greeting });
      assert('Profile contains preferred sign-off', typeof profile.signoff === 'string' && profile.signoff.length > 0, { signoff: profile.signoff });
      assert('Profile contains style description', typeof profile.style_description === 'string' && profile.style_description.length > 10);
      assert('Profile contains characteristics array', Array.isArray(profile.characteristics) && profile.characteristics.length > 0, { traits: profile.characteristics });
      assert('Profile tracks learned_from_count', typeof profile.learned_from_count === 'number' && profile.learned_from_count > 0, { count: profile.learned_from_count });

      // Check Supabase persistence of the profile
      const persistedProfile = await store.getStyleProfile();
      assert('Style profile persisted in Supabase user_style_profiles', persistedProfile !== null && persistedProfile.tone === profile.tone);

      // -------------------------------------------------------------
      // Test 2: Style Profile Retrieval (GET /api/style/profile)
      // -------------------------------------------------------------
      console.log('\n--- TEST 2: GET /api/style/profile ---');
      const getProfileRes = await fetch(`${BASE}/api/style/profile`);
      const getProfileData = await getProfileRes.json();
      assert('GET /api/style/profile returns 200 OK', getProfileRes.status === 200);
      assert('Retrieved profile matches learned profile tone', getProfileData.profile?.tone === profile.tone);
      assert('Retrieved profile has sample examples', Array.isArray(getProfileData.examples) && getProfileData.examples.length > 0);

      // -------------------------------------------------------------
      // Test 3: Contextual Reply Draft Generation (POST /api/emails/:id/generate-reply)
      // -------------------------------------------------------------
      console.log('\n--- TEST 3: CONTEXTUAL REPLY DRAFT GENERATION (POST /api/emails/:id/generate-reply) ---');
      const emailsRes = await fetch(`${BASE}/api/emails`);
      const emailsData = await emailsRes.json();
      assert('Inbox has emails available for drafting', Array.isArray(emailsData.emails) && emailsData.emails.length > 0);

      const targetEmail = emailsData.emails[0];
      console.log(`Generating reply draft for email: "${targetEmail.subject}" from "${targetEmail.sender_name || targetEmail.sender}"...`);

      const replyRes = await fetch(`${BASE}/api/emails/${targetEmail.id}/generate-reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const replyData = await replyRes.json();
      assert('Generate reply returns 200 OK', replyRes.status === 200);
      assert('Generate reply returned draft object', !!replyData.draft);
      assert('Generate reply returned style profile', !!replyData.styleProfile);

      const draft: Draft = replyData.draft;
      assert('Draft is linked to correct email_id', draft.email_id === targetEmail.id);
      assert('Draft status is "draft"', draft.status === 'draft');
      assert('Draft content is non-empty string', typeof draft.content === 'string' && draft.content.trim().length > 30, { length: draft.content.length });

      // Verify authentic reply content (not generic template)
      const contentLower = draft.content.toLowerCase();
      const hasGreeting = contentLower.includes('hi') || contentLower.includes('hello') || contentLower.includes(profile.greeting.toLowerCase());
      const hasSignoff = contentLower.includes(profile.signoff.toLowerCase()) || contentLower.includes('thanks') || contentLower.includes('best') || contentLower.includes('regards');
      assert('Draft includes greeting matching style or sender', hasGreeting);
      assert('Draft includes sign-off matching style', hasSignoff);

      // Verify tone match scores
      assert('Draft contains tone_match_scores object', !!draft.tone_match_scores);
      assert('Tone match scores has professional score', typeof draft.tone_match_scores.professional === 'boolean');
      assert('Tone match scores has concise score', typeof draft.tone_match_scores.concise === 'boolean');
      assert('Tone match scores has direct score', typeof draft.tone_match_scores.direct === 'boolean');
      assert('Tone match scores has preferred_greeting score', typeof draft.tone_match_scores.preferred_greeting === 'boolean');
      assert('Tone match scores has preferred_signoff score', typeof draft.tone_match_scores.preferred_signoff === 'boolean');

      // Verify persistence in Supabase
      const persistedDraft = await store.getDraftByEmailId(targetEmail.id);
      assert('Draft correctly persisted in Supabase drafts table', persistedDraft !== undefined && persistedDraft.id === draft.id);

      // -------------------------------------------------------------
      // Test 4: Alternative Body-based Endpoint (POST /api/drafts/generate)
      // -------------------------------------------------------------
      console.log('\n--- TEST 4: POST /api/drafts/generate ALIAS ENDPOINT ---');
      if (emailsData.emails.length > 1) {
        const targetEmail2 = emailsData.emails[1];
        const aliasRes = await fetch(`${BASE}/api/drafts/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email_id: targetEmail2.id })
        });
        const aliasData = await aliasRes.json();
        assert('POST /api/drafts/generate returns 200 OK', aliasRes.status === 200);
        assert('Alias endpoint generated draft for targetEmail2', aliasData.draft?.email_id === targetEmail2.id);
      } else {
        console.log('Skipping secondary email test (only 1 email in inbox)');
      }

      // -------------------------------------------------------------
      // Test 5: Enriched Drafts Listing (GET /api/drafts)
      // -------------------------------------------------------------
      console.log('\n--- TEST 5: ENRICHED DRAFTS LISTING (GET /api/drafts) ---');
      const draftsRes = await fetch(`${BASE}/api/drafts`);
      const draftsData = await draftsRes.json();
      assert('GET /api/drafts returns 200 OK', draftsRes.status === 200);
      assert('Drafts array returned', Array.isArray(draftsData.drafts) && draftsData.drafts.length > 0);

      const enrichedDraft = draftsData.drafts.find((d: any) => d.email_id === targetEmail.id);
      assert('Draft is found in drafts list', !!enrichedDraft);
      assert('Draft is enriched with email_subject', typeof enrichedDraft?.email_subject === 'string' && enrichedDraft.email_subject.length > 0, { subject: enrichedDraft?.email_subject });
      assert('Draft is enriched with email_sender', typeof enrichedDraft?.email_sender === 'string' && enrichedDraft.email_sender.length > 0, { sender: enrichedDraft?.email_sender });
      assert('Draft is enriched with email_priority', typeof enrichedDraft?.email_priority === 'string');
      assert('Draft is enriched with email_topic', typeof enrichedDraft?.email_topic === 'string');

      // -------------------------------------------------------------
      // Test 6: Draft Editing & Update (PUT /api/drafts/:id)
      // -------------------------------------------------------------
      console.log('\n--- TEST 6: DRAFT EDITING & PERSISTENCE (PUT /api/drafts/:id) ---');
      const editedContent = `Hi ${targetEmail.sender_name || 'there'},\n\nI have reviewed the update and agree with the proposed approach.\n\n${profile.signoff},\nSai`;
      const updateRes = await fetch(`${BASE}/api/drafts/${draft.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editedContent, email_id: targetEmail.id })
      });
      const updateData = await updateRes.json();
      assert('PUT /api/drafts/:id returns 200 OK', updateRes.status === 200);
      assert('Draft content updated in memory/Supabase', updateData.draft?.content === editedContent);
      assert('Draft status remains "draft"', updateData.draft?.status === 'draft');

      // -------------------------------------------------------------
      // Test 7: Heuristic Fallback Draft Generation Unit Test
      // -------------------------------------------------------------
      console.log('\n--- TEST 7: HEURISTIC FALLBACK DRAFT GENERATION ---');
      const heuristicDraft = aiService.heuristicReplyDraft(
        {
          subject: 'Budget allocation review for Q4',
          body: 'Sai, please look at the attached numbers for Q4. We need your feedback by tomorrow morning.',
          sender: 'cfo@mailpilot.demo',
          sender_name: 'David Delainey'
        },
        profile
      );

      assert('Heuristic draft includes recipient name', heuristicDraft.content.includes('David') || heuristicDraft.content.includes('Hi'));
      assert('Heuristic draft references context/subject', heuristicDraft.content.toLowerCase().includes('budget') || heuristicDraft.content.toLowerCase().includes('review'));
      assert('Heuristic draft ends with user sign-off', heuristicDraft.content.includes(profile.signoff));
      assert('Heuristic draft has valid tone match scores', heuristicDraft.tone_match_scores.concise && heuristicDraft.tone_match_scores.professional);

      // -------------------------------------------------------------
      // Test 8: Regression Verification (Phase 1, 2, 3)
      // -------------------------------------------------------------
      console.log('\n--- TEST 8: REGRESSION VERIFICATION (PHASES 1, 2, 3) ---');
      // Phase 3 triage
      const triageRes = await fetch(`${BASE}/api/emails/${targetEmail.id}/triage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const triageData = await triageRes.json();
      assert('Phase 3 email triage continues to succeed', triageRes.status === 200 && !!triageData.email?.priority);

      // Stats check
      const statsRes = await fetch(`${BASE}/api/stats`);
      const statsData = await statsRes.json();
      const stats = statsData.stats || statsData;
      assert('Dashboard stats endpoint returns 200', statsRes.status === 200);
      assert('Dashboard stats include draftsCount >= 1', typeof stats.draftsCount === 'number' && stats.draftsCount >= 1, { draftsCount: stats.draftsCount });

      // Final score
      console.log('\n================================================================');
      console.log(`🏁 PHASE 4 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
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

runPhase4Tests();
