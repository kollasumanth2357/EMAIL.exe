import fs from 'fs';
import readline from 'readline';

interface Candidate {
  file: string;
  from: string;
  senderName: string;
  to: string;
  subject: string;
  date: string;
  body: string;
}

function cleanBody(rawBody: string): string {
  let b = rawBody.trim();

  // Strip forwarded header blocks
  if (b.includes('---------------------- Forwarded by')) {
    const idx = b.indexOf('---------------------- Forwarded by');
    const endIdx = b.indexOf('Subject:', idx);
    if (endIdx !== -1) {
      const lineEnd = b.indexOf('\n', endIdx);
      if (lineEnd !== -1) {
        b = b.slice(lineEnd + 1).trim();
      }
    } else {
      b = b.slice(0, idx).trim();
    }
  }

  // Strip -----Original Message----- blocks
  if (b.includes('-----Original Message-----')) {
    b = b.slice(0, b.indexOf('-----Original Message-----')).trim();
  }

  // Remove phone numbers and emails
  b = b.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[phone]');
  b = b.replace(/@enron\.com/gi, '@mailpilot.demo');
  b = b.replace(/@ECT\b/gi, '');
  b = b.replace(/@ENRON\b/gi, '');
  b = b.replace(/@EnronXGate/gi, '');

  return b.trim();
}

function extractName(from: string, xFrom?: string): string {
  if (xFrom && xFrom.trim().length > 0) {
    let name = xFrom.split('<')[0].replace(/"/g, '').trim();
    if (name.includes('/')) name = name.split('/')[0].trim();
    if (name.length > 2 && name.length < 30) return name;
  }
  const local = from.split('@')[0];
  const parts = local.split('.').map(p => p.charAt(0).toUpperCase() + p.slice(1));
  return parts.join(' ');
}

async function run() {
  const filePath = 'C:/Users/HP/Downloads/archive/emails.csv';
  const stream = fs.createReadStream(filePath, { encoding: 'utf8', highWaterMark: 128 * 1024 });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  const inboxPool: Candidate[] = [];
  const sentPool: Candidate[] = [];

  let currentFile = '';
  let currentRaw = '';
  let totalProcessed = 0;

  for await (const line of rl) {
    const match = line.match(/^"([^"]+)","(Message-ID:.*)$/);
    if (match) {
      if (currentFile && currentRaw) {
        totalProcessed++;
        processEmail(currentFile, currentRaw, inboxPool, sentPool);
      }
      currentFile = match[1];
      currentRaw = match[2];
    } else if (currentFile) {
      currentRaw += '\n' + line;
    }

    if (inboxPool.length >= 80 && sentPool.length >= 30) break;
    if (totalProcessed > 30000) break;
  }

  console.log(`Scanned ${totalProcessed} records. Gathered ${inboxPool.length} inbox candidates and ${sentPool.length} sent candidates.`);

  // Write out candidate pools for inspection
  fs.writeFileSync(
    'd:/IDEASTORM/server/scripts/enron_pool.json',
    JSON.stringify({ inbox: inboxPool.slice(0, 50), sent: sentPool.slice(0, 25) }, null, 2)
  );

  console.log('Saved pools to d:/IDEASTORM/server/scripts/enron_pool.json');
}

function processEmail(file: string, raw: string, inbox: Candidate[], sent: Candidate[]) {
  let cleanRaw = raw;
  if (cleanRaw.endsWith('"')) cleanRaw = cleanRaw.slice(0, -1);

  const headerEnd = cleanRaw.indexOf('\n\n');
  const headerStr = headerEnd !== -1 ? cleanRaw.slice(0, headerEnd) : cleanRaw;
  const rawBody = headerEnd !== -1 ? cleanRaw.slice(headerEnd + 2) : '';

  const body = cleanBody(rawBody);
  if (body.length < 60 || body.length > 700) return;
  if (body.split('\n').length > 25) return;

  const headers: Record<string, string> = {};
  const lines = headerStr.split('\n');
  let lastKey = '';
  for (const l of lines) {
    const colonIdx = l.indexOf(':');
    if (colonIdx > 0 && !l.startsWith(' ') && !l.startsWith('\t')) {
      lastKey = l.slice(0, colonIdx).trim().toLowerCase();
      headers[lastKey] = l.slice(colonIdx + 1).trim();
    } else if (lastKey) {
      headers[lastKey] += ' ' + l.trim();
    }
  }

  let subject = headers['subject'] || '';
  if (!subject || subject.trim() === '' || subject.toLowerCase() === 're:') return;
  if (subject.toLowerCase().includes('enron') && subject.toLowerCase().includes('bankruptcy')) return;

  const from = (headers['from'] || '').replace(/@enron\.com/gi, '@mailpilot.demo');
  const to = (headers['to'] || '').replace(/@enron\.com/gi, '@mailpilot.demo');
  const xFrom = headers['x-from'] || '';
  const senderName = extractName(headers['from'] || '', xFrom);

  const cand: Candidate = {
    file,
    from,
    senderName,
    to,
    subject,
    date: headers['date'] || '',
    body
  };

  const isSent = file.includes('sent') || file.includes('sent_items');
  if (isSent && sent.length < 35) {
    sent.push(cand);
  } else if (!isSent && inbox.length < 90) {
    inbox.push(cand);
  }
}

run().catch(console.error);
