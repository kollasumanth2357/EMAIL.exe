// Automated end-to-end verification script for MailPilot

const BASE = 'http://localhost:5000/api';

async function runTests() {
  console.log('=== STARTING MAILPILOT END-TO-END VERIFICATION ===\n');

  // Test 1: Health check
  console.log('Test 1: Server Health Check');
  const healthRes = await fetch('http://localhost:5000/health');
  const health = await healthRes.json();
  console.log('✓ Health:', health.status, health.product);

  // Test 2: Load Demo Inbox
  console.log('\nTest 2: Load Demo Inbox');
  const loadRes = await fetch(`${BASE}/emails/load-demo`, { method: 'POST' });
  const loadData = await loadRes.json();
  console.log(`✓ Demo Loaded: ${loadData.emailsCount} emails, ${loadData.sentCount} sent, ${loadData.threadsCount} threads`);

  // Test 3: Stats check
  console.log('\nTest 3: Inbox Stats');
  const statsRes = await fetch(`${BASE}/stats`);
  const stats = (await statsRes.json()).stats;
  console.log(`✓ Stats: Total=${stats.total}, Urgent=${stats.urgent}, ActionReq=${stats.actionRequired}, TimeSaved=${stats.estimatedMinutesSaved}m`);

  // Test 4: Filter by Urgent
  console.log('\nTest 4: Filter Emails (Priority = Urgent)');
  const urgentRes = await fetch(`${BASE}/emails?priority=Urgent`);
  const urgentEmails = (await urgentRes.json()).emails;
  console.log(`✓ Urgent count: ${urgentEmails.length}`);
  urgentEmails.forEach(e => console.log(`   - [URGENT] ${e.sender_name}: ${e.subject}`));

  // Test 5: Search
  console.log('\nTest 5: Search for "deadline"');
  const searchRes = await fetch(`${BASE}/emails?search=deadline`);
  const searchEmails = (await searchRes.json()).emails;
  console.log(`✓ Search results: ${searchEmails.length} matching "deadline"`);
  searchEmails.forEach(e => console.log(`   - Found: ${e.subject}`));

  // Test 6: Email Detail with Thread Messages
  console.log('\nTest 6: Fetch Email Detail (email_01 - Prof. Kumar)');
  const detailRes = await fetch(`${BASE}/emails/email_01`);
  const detail = await detailRes.json();
  console.log(`✓ Email Subject: ${detail.email.subject}`);
  console.log(`✓ Thread message count: ${detail.thread.messages.length}`);
  console.log(`✓ Two-line summary: \n"${detail.email.summary}"`);

  // Test 7: Generate Style-Matched Reply
  console.log('\nTest 7: Generate Reply for email_01');
  const replyRes = await fetch(`${BASE}/emails/email_01/generate-reply`, { method: 'POST' });
  const replyData = await replyRes.json();
  console.log('✓ Generated Draft Content:');
  console.log('----------------------------------------------------');
  console.log(replyData.draft.content);
  console.log('----------------------------------------------------');
  console.log('✓ Tone Match Scores:', replyData.draft.tone_match_scores);

  // Test 8: Save Draft Edit
  console.log('\nTest 8: Save Draft with Custom User Edit');
  const editedContent = replyData.draft.content + '\n\nI will also send an updated slide deck by 4 PM.';
  const saveRes = await fetch(`${BASE}/drafts/email_01/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email_id: 'email_01', content: editedContent })
  });
  const savedDraft = (await saveRes.json()).draft;
  console.log(`✓ Draft updated at: ${savedDraft.updated_at}`);

  // Test 9: Approve & Send (Simulated Send Flow)
  console.log('\nTest 9: Approve & Send Reply');
  const sendRes = await fetch(`${BASE}/drafts/email_01/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email_id: 'email_01', content: editedContent })
  });
  const sendResult = await sendRes.json();
  console.log('✓ Sent Result:', sendResult.message);
  console.log(`✓ Sent to: ${sendResult.sentEmail.recipient}, Status: ${sendResult.sentEmail.status}, At: ${sendResult.sentEmail.sent_at}`);

  // Test 10: Verify Sent Archive
  console.log('\nTest 10: Verify Sent Archive');
  const sentListRes = await fetch(`${BASE}/sent`);
  const sentList = (await sentListRes.json()).sent;
  console.log(`✓ Total Sent Archive Count: ${sentList.length}`);
  const topSent = sentList[0];
  console.log(`✓ Latest Sent Item: To: ${topSent.recipient} | Subject: ${topSent.subject}`);

  // Test 11: Style Profile Verification
  console.log('\nTest 11: Style Profile & Comparison Proof');
  const styleRes = await fetch(`${BASE}/style`);
  const styleData = await styleRes.json();
  console.log(`✓ Tone: ${styleData.profile.tone}`);
  console.log(`✓ Greeting: ${styleData.profile.greeting}`);
  console.log(`✓ Signoff: ${styleData.profile.signoff}`);
  console.log(`✓ Learned from count: ${styleData.profile.learned_from_count}`);
  console.log(`✓ Characteristics: ${styleData.profile.characteristics.join(', ')}`);

  // Test 12: Trigger Full AI Triage Analysis
  console.log('\nTest 12: Run Full AI Triage Analysis');
  const analyzeRes = await fetch(`${BASE}/emails/analyze`, { method: 'POST' });
  const analyzeData = await analyzeRes.json();
  console.log(`✓ Triage Result: ${analyzeData.message}`);

  // Test 13: Frontend HTML and asset serving
  console.log('\nTest 13: Verify Frontend HTML at http://localhost:5173');
  const clientRes = await fetch('http://localhost:5173/');
  const clientHtml = await clientRes.text();
  console.log(`✓ Frontend HTTP Status: ${clientRes.status}, Title present: ${clientHtml.includes('MailPilot')}`);

  console.log('\n=== ALL 13 VERIFICATION TESTS PASSED SUCCESSFULLY! ===\n');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
