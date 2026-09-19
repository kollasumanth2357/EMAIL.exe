import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import apiRouter from '../src/routes/api.js';
import { gmailService, GMAIL_READONLY_SCOPE, DEFAULT_REDIRECT_URI } from '../src/services/gmail.service.js';
import { GmailStatus } from '../src/types/index.js';

async function runGmailOAuthTests() {
  console.log('================================================================');
  console.log('🚀 GMAIL OAUTH INTEGRATION & DEMO SANDBOX VERIFICATION');
  console.log('================================================================\n');

  const app = express();
  app.use(express.json());
  app.use('/api', apiRouter);

  const TEST_PORT = 5897;
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
      // TEST 1: DEFAULT STATUS & DETECTION (NO OAUTH CREDENTIALS IN .ENV)
      // -------------------------------------------------------------
      console.log('--- TEST 1: OAUTH CONFIGURATION DETECTION (DEFAULT UNCONFIGURED) ---');
      const origClientId = process.env.GOOGLE_CLIENT_ID;
      const origClientSecret = process.env.GOOGLE_CLIENT_SECRET;
      const origRedirectUri = process.env.GOOGLE_REDIRECT_URI;

      // Ensure credentials are unset for clean baseline
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;

      const statusRes = await fetch(`${BASE}/api/gmail/status`);
      assert('GET /api/gmail/status returns 200 OK', statusRes.status === 200);
      const statusData: GmailStatus = await statusRes.json();

      assert('Gmail status reports configured = false when env absent', statusData.configured === false);
      assert('Gmail status reports mode = demo when unconfigured', statusData.mode === 'demo');
      assert('Gmail status includes missingEnv for GOOGLE_CLIENT_ID', statusData.missingEnv.includes('GOOGLE_CLIENT_ID'));
      assert('Gmail status includes missingEnv for GOOGLE_CLIENT_SECRET', statusData.missingEnv.includes('GOOGLE_CLIENT_SECRET'));
      assert('Gmail status specifies readonly scope', statusData.scopes.includes(GMAIL_READONLY_SCOPE));

      // -------------------------------------------------------------
      // TEST 2: AUTH URL START WITHOUT CREDENTIALS
      // -------------------------------------------------------------
      console.log('\n--- TEST 2: AUTHORIZATION START WITHOUT CREDENTIALS ---');
      const startFailRes = await fetch(`${BASE}/api/gmail/oauth/start`, {
        headers: { Accept: 'application/json' },
        redirect: 'manual'
      });
      assert('GET /api/gmail/oauth/start returns 400 when unconfigured', startFailRes.status === 400);
      const startFailData = await startFailRes.json();
      assert('Start returns descriptive error', Boolean(startFailData.error && startFailData.error.includes('not configured')));

      // -------------------------------------------------------------
      // TEST 3: OAUTH CONFIGURATION DETECTION & URL GENERATION (WITH CREDENTIALS)
      // -------------------------------------------------------------
      console.log('\n--- TEST 3: AUTHORIZATION URL GENERATION WITH CREDENTIALS ---');
      const DUMMY_CLIENT_ID = 'test-client-id-12345.apps.googleusercontent.com';
      const DUMMY_CLIENT_SECRET = 'test-client-secret-xyz';
      const DUMMY_REDIRECT_URI = 'http://localhost:5000/api/gmail/oauth/callback';

      process.env.GOOGLE_CLIENT_ID = DUMMY_CLIENT_ID;
      process.env.GOOGLE_CLIENT_SECRET = DUMMY_CLIENT_SECRET;
      process.env.GOOGLE_REDIRECT_URI = DUMMY_REDIRECT_URI;

      const configuredStatusRes = await fetch(`${BASE}/api/gmail/status`);
      const configuredStatusData: GmailStatus = await configuredStatusRes.json();
      assert('Gmail status reports configured = true when credentials present', configuredStatusData.configured === true);
      assert('Gmail status missingEnv is empty', configuredStatusData.missingEnv.length === 0);
      assert('Gmail service getRedirectUri returns exact callback URI', gmailService.getRedirectUri() === DUMMY_REDIRECT_URI);

      const startSuccessRes = await fetch(`${BASE}/api/gmail/oauth/start`, {
        headers: { Accept: 'application/json' }
      });
      assert('GET /api/gmail/oauth/start returns 200 OK with JSON', startSuccessRes.status === 200);
      const startSuccessData = await startSuccessRes.json();
      assert('Response contains authUrl string', typeof startSuccessData.authUrl === 'string');

      const authUrl: string = startSuccessData.authUrl;
      console.log(`Generated Auth URL: ${authUrl.substring(0, 90)}...`);
      assert('Auth URL targets Google OAuth 2.0 endpoint', authUrl.includes('accounts.google.com/o/oauth2/v2/auth'));
      assert('Auth URL contains exact redirect URI', authUrl.includes(encodeURIComponent(DUMMY_REDIRECT_URI)));
      assert('Auth URL contains gmail.readonly scope', authUrl.includes(encodeURIComponent(GMAIL_READONLY_SCOPE)));
      assert('Auth URL contains access_type=offline', authUrl.includes('access_type=offline'));
      assert('Auth URL contains response_type=code', authUrl.includes('response_type=code'));
      assert('Auth URL contains dummy client_id', authUrl.includes(encodeURIComponent(DUMMY_CLIENT_ID)));

      // -------------------------------------------------------------
      // TEST 4: OAUTH CALLBACK HANDLING: MISSING CODE
      // -------------------------------------------------------------
      console.log('\n--- TEST 4: CALLBACK HANDLING WITH MISSING AUTHORIZATION CODE ---');
      const callbackNoCodeRes = await fetch(`${BASE}/api/gmail/oauth/callback`, {
        headers: { Accept: 'application/json' },
        redirect: 'manual'
      });
      assert('Callback without code returns 400 Bad Request', callbackNoCodeRes.status === 400);
      const noCodeData = await callbackNoCodeRes.json();
      assert('Response specifies missing authorization code', noCodeData.error === 'Missing authorization code');

      // -------------------------------------------------------------
      // TEST 5: OAUTH CALLBACK HANDLING: GOOGLE ERROR PARAMETER
      // -------------------------------------------------------------
      console.log('\n--- TEST 5: CALLBACK HANDLING WITH GOOGLE ERROR PARAMETER ---');
      const callbackErrorRes = await fetch(`${BASE}/api/gmail/oauth/callback?error=access_denied`, {
        headers: { Accept: 'application/json' },
        redirect: 'manual'
      });
      assert('Callback with error returns 400 Bad Request', callbackErrorRes.status === 400);
      const errorData = await callbackErrorRes.json();
      assert('Response propagates error parameter', errorData.error === 'access_denied');

      // -------------------------------------------------------------
      // TEST 6: OAUTH CALLBACK HANDLING: INVALID CODE EXCHANGE
      // -------------------------------------------------------------
      console.log('\n--- TEST 6: CALLBACK HANDLING WITH INVALID AUTHORIZATION CODE ---');
      const callbackInvalidCodeRes = await fetch(`${BASE}/api/gmail/oauth/callback?code=invalid_mock_code_for_testing`, {
        headers: { Accept: 'application/json' },
        redirect: 'manual'
      });
      assert('Exchange with invalid code rejected with 400', callbackInvalidCodeRes.status === 400);
      const invalidData = await callbackInvalidCodeRes.json();
      assert('Response contains error from token exchange', Boolean(invalidData.error));

      // -------------------------------------------------------------
      // TEST 7: DEMO SANDBOX PRESERVATION & FALLBACK
      // -------------------------------------------------------------
      console.log('\n--- TEST 7: DEMO SANDBOX LIFECYCLE (CONNECT, SYNC, DISCONNECT) ---');
      // Restore environment to test demo sandbox clean state
      if (origClientId) process.env.GOOGLE_CLIENT_ID = origClientId;
      else delete process.env.GOOGLE_CLIENT_ID;

      if (origClientSecret) process.env.GOOGLE_CLIENT_SECRET = origClientSecret;
      else delete process.env.GOOGLE_CLIENT_SECRET;

      if (origRedirectUri) process.env.GOOGLE_REDIRECT_URI = origRedirectUri;
      else delete process.env.GOOGLE_REDIRECT_URI;

      const demoConnectRes = await fetch(`${BASE}/api/gmail/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountEmail: 'alex.morgan@gmail.com' })
      });
      assert('POST /api/gmail/connect returns 200 OK', demoConnectRes.status === 200);
      const demoConnectData = await demoConnectRes.json();
      assert('Demo connected = true', demoConnectData.connected === true);
      assert('Demo account email is alex.morgan@gmail.com', demoConnectData.accountEmail === 'alex.morgan@gmail.com');

      const demoSyncRes = await fetch(`${BASE}/api/gmail/sync`, { method: 'POST' });
      assert('POST /api/gmail/sync returns 200 OK', demoSyncRes.status === 200);
      const demoSyncData = await demoSyncRes.json();
      assert('Demo sync imports >= 4 emails', demoSyncData.stats.imported >= 4);
      assert('Demo sync records threads >= 1', demoSyncData.stats.threads >= 1);
      assert('Demo sync records lastSync timestamp', Boolean(demoSyncData.gmailStatus.lastSync));

      const demoDisconnectRes = await fetch(`${BASE}/api/gmail/disconnect`, { method: 'POST' });
      assert('POST /api/gmail/disconnect returns 200 OK', demoDisconnectRes.status === 200);
      const demoDisconnectData = await demoDisconnectRes.json();
      assert('Demo disconnected = false', demoDisconnectData.connected === false);

      // -------------------------------------------------------------
      // TEST 8: SCOPE & READ-ONLY ENFORCEMENT AUDIT
      // -------------------------------------------------------------
      console.log('\n--- TEST 8: SCOPE & READ-ONLY INTEGRITY AUDIT ---');
      assert('GMAIL_READONLY_SCOPE is strictly gmail.readonly', GMAIL_READONLY_SCOPE === 'https://www.googleapis.com/auth/gmail.readonly');
      assert('Default redirect URI matches specification', DEFAULT_REDIRECT_URI === 'http://localhost:5000/api/gmail/oauth/callback');

      const finalStatusRes = await fetch(`${BASE}/api/gmail/status`);
      const finalStatusData: GmailStatus = await finalStatusRes.json();
      assert('Final status scopes list only contains gmail.readonly', finalStatusData.scopes.length === 1 && finalStatusData.scopes[0] === GMAIL_READONLY_SCOPE);

      console.log('\n================================================================');
      console.log(`🏁 GMAIL OAUTH SUMMARY: ${passed} PASSED, ${failed} FAILED (${Math.round((passed / (passed + failed)) * 100)}% PASS RATE)`);
      console.log('================================================================');

      server.close();
      process.exit(failed > 0 ? 1 : 0);
    } catch (err: any) {
      console.error('Fatal test runner error:', err);
      server.close();
      process.exit(1);
    }
  });
}

runGmailOAuthTests();
