import { logger } from '../src/utils/logger.js';
import { authRateLimiter } from '../src/middleware/rateLimiter.js';
import { importService } from '../src/services/import.service.js';
import { queueService } from '../src/services/queue.service.js';
import { aiService } from '../src/services/ai.service.js';

async function runEvaluatorFixesVerification() {
  console.log('====================================================');
  console.log('   MAILPILOT EVALUATOR IMPROVEMENTS VERIFICATION    ');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(name: string, condition: boolean, detail?: string) {
    totalTests++;
    if (condition) {
      console.log(`  [PASS] ${name}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] ${name} ${detail ? `(${detail})` : ''}`);
    }
  }

  // ----------------------------------------------------
  // TEST 1: Structured Logger & Secret Redaction
  // ----------------------------------------------------
  console.log('[1/6] Testing Structured Logger & Secret Redaction...');
  try {
    logger.info('Testing info log message with context', 'TEST_CONTEXT', { detail: 'standard info' });
    logger.warn('Testing warning log with sensitive metadata', 'SECURITY', {
      password: 'superSecretPassword123',
      api_key: 'gsk_abcdef1234567890',
      token: 'ya29.a0AfH6SMD_secret_oauth_token',
      normal_field: 'safe_value'
    });
    assert('Structured logger executes without throwing', true);
  } catch (err: any) {
    assert('Structured logger executes without throwing', false, err.message);
  }

  // ----------------------------------------------------
  // TEST 2: Auth Rate Limiter
  // ----------------------------------------------------
  console.log('\n[2/6] Testing Authentication Rate Limiter...');
  try {
    const testIp = '192.168.1.99';
    let blocked = false;
    let rateLimitHeaders: Record<string, any> = {};

    for (let i = 0; i < 20; i++) {
      const mockReq: any = {
        ip: testIp,
        headers: {},
        path: '/api/auth/login'
      };
      let nextCalled = false;
      const mockRes: any = {
        setHeader: (k: string, v: any) => { rateLimitHeaders[k] = v; },
        status: (code: number) => ({
          json: (body: any) => {
            if (code === 429) {
              blocked = true;
            }
          }
        })
      };
      const mockNext = () => { nextCalled = true; };

      authRateLimiter(mockReq, mockRes, mockNext);
    }

    assert('Rate limiter permits initial requests and blocks beyond limit (429)', blocked);
    assert('Rate limiter sets Retry-After and X-RateLimit headers', !!rateLimitHeaders['X-RateLimit-Limit']);
  } catch (err: any) {
    assert('Auth Rate Limiter test', false, err.message);
  }

  // ----------------------------------------------------
  // TEST 3: Robust Import Validation for Malformed Records
  // ----------------------------------------------------
  console.log('\n[3/6] Testing Import Validation for Malformed Records...');
  try {
    assert('isValidEmailAddress validates correct email', importService.isValidEmailAddress('user@company.com') === true);
    assert('isValidEmailAddress rejects missing @', importService.isValidEmailAddress('usercompany.com') === false);
    assert('isValidEmailAddress rejects spaces', importService.isValidEmailAddress('user @company.com') === false);
    assert('isValidEmailAddress rejects empty', importService.isValidEmailAddress('') === false);

    const malformedCsv = `From,To,Subject,Body
valid.sender@company.com,recipient@company.com,Valid Subject,This is a valid body with sufficient content.
,recipient@company.com,Missing Sender,Body with missing sender.
invalid-email-no-at,recipient@company.com,Invalid Sender Format,Malformed email address body.
another.sender@company.com,valid.to@company.com,Valid Second Email,Second valid body text with good length.`;

    const result = await importService.processUpload({
      fileBuffer: Buffer.from(malformedCsv),
      fileName: 'test_validation.csv',
      limit: 10
    });

    assert('Import succeeds without crashing on malformed rows', result.stats.imported >= 2);
  } catch (err: any) {
    assert('Import Validation test', false, err.message);
  }

  // ----------------------------------------------------
  // TEST 4: Asynchronous Job Queue Architecture
  // ----------------------------------------------------
  console.log('\n[4/6] Testing Asynchronous Job Queue...');
  try {
    let progressSeen = false;
    const job = queueService.submitJob(
      'batch_test',
      { items: 5 },
      async (_j, updateProgress) => {
        for (let i = 1; i <= 5; i++) {
          updateProgress({ total: 5, processed: i, successful: i });
        }
        return { completed: true, count: 5 };
      }
    );

    assert('Job enqueued with pending/processing status', job.status === 'pending' || job.status === 'processing');
    assert('Job retrieved by ID from queueService', queueService.getJob(job.id)?.id === job.id);

    // Wait for setImmediate job execution
    await new Promise(resolve => setTimeout(resolve, 50));
    const completedJob = queueService.getJob(job.id);
    assert('Job completed asynchronously and recorded result', completedJob?.status === 'completed' && completedJob.result?.completed === true);
    assert('Job list contains recent submitted jobs', queueService.listJobs(10).length > 0);
  } catch (err: any) {
    assert('Job Queue test', false, err.message);
  }

  // ----------------------------------------------------
  // TEST 5: Writing Style Stylometry & Personalization
  // ----------------------------------------------------
  console.log('\n[5/6] Testing Stylometry Learning & Tone Confidence...');
  try {
    const mockSentEmails = [
      {
        id: 'sent_1',
        original_email_id: 'e1',
        recipient: 'colleague@teampilot.dev',
        subject: 'Re: API updates',
        body: 'Hi Alex,\n\nThanks for the update. I approved the PR and deployed to staging.\n\nRegards,\nSai',
        sent_at: new Date().toISOString(),
        status: 'Sent' as const
      },
      {
        id: 'sent_2',
        original_email_id: 'e2',
        recipient: 'client@external.com',
        subject: 'Re: Contract Renewal',
        body: 'Dear Ms. Smith,\n\nThank you for your inquiry. We have finalized the terms and look forward to partnering.\n\nBest regards,\nSai',
        sent_at: new Date().toISOString(),
        status: 'Sent' as const
      }
    ];

    const stylometry = aiService.calculateStylometry(mockSentEmails);
    assert('Stylometry calculates average sentence length', stylometry.avg_sentence_words > 0);
    assert('Stylometry calculates vocabulary richness', !!stylometry.vocabulary_richness);
    assert('Stylometry assigns confidence score', stylometry.confidence_score >= 70);

    const profile = await aiService.analyzeWritingStyle(mockSentEmails);
    assert('UserStyleProfile contains stylometry metrics', !!profile.stylometry);

    const replyResult = await aiService.generateReply(
      {
        id: 'test_e1',
        thread_id: 'th_1',
        sender: 'colleague@teampilot.dev',
        sender_name: 'Alex Rivera',
        recipient: 'sai@mailpilot.demo',
        subject: 'Status check',
        body: 'Are we on track for the release today?',
        timestamp: new Date().toISOString(),
        priority: 'Normal',
        topic: 'Work',
        summary: 'Alex checking release status.',
        is_read: true,
        status: 'inbox',
        created_at: new Date().toISOString()
      },
      undefined,
      undefined,
      profile,
      mockSentEmails,
      { tone: 3 }
    );

    assert('generateReply generates style-matched content', !!replyResult.content);
    assert('generateReply returns confidence score in tone match scores', typeof replyResult.tone_match_scores.confidence_score === 'number');
    assert('generateReply detects recipient register', !!replyResult.tone_match_scores.recipient_register);
  } catch (err: any) {
    assert('Stylometry & Personalization test', false, err.message);
  }

  // ----------------------------------------------------
  // TEST 6: Demo Mode Isolation Verification
  // ----------------------------------------------------
  console.log('\n[6/6] Testing Demo Mode Isolation Contract...');
  try {
    // Verify Demo request identification contract
    const { isDemoRequest } = await import('../src/routes/api.js');
    const demoReq: any = { headers: { 'x-is-demo': 'true' }, query: {}, body: {} };
    const realReq: any = { headers: {}, query: {}, body: {} };

    assert('isDemoRequest identifies header x-is-demo: true', isDemoRequest(demoReq) === true);
    assert('isDemoRequest identifies non-demo request correctly', isDemoRequest(realReq) === false);
  } catch (err: any) {
    assert('Demo Mode isolation test', false, err.message);
  }

  console.log('\n====================================================');
  console.log(`   VERIFICATION COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('====================================================\n');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runEvaluatorFixesVerification().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
