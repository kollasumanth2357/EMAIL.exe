async function testAnalyzeBeforeAndAfterSend() {
  const BASE = 'http://localhost:5000/api';

  console.log('--- Step 1: Load Demo Inbox ---');
  await fetch(`${BASE}/emails/load-demo`, { method: 'POST' });

  console.log('--- Step 2: Analyze right after load demo ---');
  const res1 = await fetch(`${BASE}/emails/analyze`, { method: 'POST' });
  const data1 = await res1.json();
  console.log('Triage right after load-demo:', data1.message, '| count:', data1.triagedCount);

  console.log('--- Step 3: Approve & Send email_01 ---');
  await fetch(`${BASE}/drafts/email_01/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email_id: 'email_01', content: 'Test reply' })
  });

  console.log('--- Step 4: Analyze after email_01 was sent ---');
  const res2 = await fetch(`${BASE}/emails/analyze`, { method: 'POST' });
  const data2 = await res2.json();
  console.log('Triage after email_01 was sent:', data2.message, '| count:', data2.triagedCount);

  // Restore clean demo state
  await fetch(`${BASE}/emails/load-demo`, { method: 'POST' });
}

testAnalyzeBeforeAndAfterSend();
