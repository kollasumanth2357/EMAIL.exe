import fs from 'fs';
import readline from 'readline';
import path from 'path';

interface EnronParsed {
  file: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  body: string;
  raw: string;
}

export async function extractEnronData(limitScan = 15000): Promise<{
  inbox: EnronParsed[];
  sent: EnronParsed[];
}> {
  const filePath = 'C:/Users/HP/Downloads/archive/emails.csv';
  if (!fs.existsSync(filePath)) {
    throw new Error(`Enron dataset not found at: ${filePath}`);
  }

  const stream = fs.createReadStream(filePath, { encoding: 'utf8', highWaterMark: 128 * 1024 });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  const inboxCandidates: EnronParsed[] = [];
  const sentCandidates: EnronParsed[] = [];

  let currentFile = '';
  let currentRaw = '';
  let recordCount = 0;

  for await (const line of rl) {
    const match = line.match(/^"([^"]+)","(Message-ID:.*)$/);

    if (match) {
      if (currentFile && currentRaw) {
        recordCount++;
        processRecord(currentFile, currentRaw, inboxCandidates, sentCandidates);
      }
      currentFile = match[1];
      currentRaw = match[2];
    } else if (currentFile) {
      currentRaw += '\n' + line;
    }

    if (recordCount >= limitScan) break;
  }

  if (currentFile && currentRaw) {
    processRecord(currentFile, currentRaw, inboxCandidates, sentCandidates);
  }

  return { inbox: inboxCandidates, sent: sentCandidates };
}

function processRecord(
  file: string,
  raw: string,
  inboxList: EnronParsed[],
  sentList: EnronParsed[]
) {
  let cleanRaw = raw;
  if (cleanRaw.endsWith('"')) cleanRaw = cleanRaw.slice(0, -1);

  const headerEnd = cleanRaw.indexOf('\n\n');
  const headerStr = headerEnd !== -1 ? cleanRaw.slice(0, headerEnd) : cleanRaw;
  let body = headerEnd !== -1 ? cleanRaw.slice(headerEnd + 2).trim() : '';

  // Remove forwarded / original message separator clutter
  if (body.includes('-----Original Message-----')) {
    const origIdx = body.indexOf('-----Original Message-----');
    if (origIdx > 60) {
      body = body.slice(0, origIdx).trim();
    }
  }

  // Filter out emails with no useful body or too long/messy
  if (body.length < 50 || body.length > 900) return;
  if (body.includes('http://') || body.includes('www.')) return;

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

  const from = headers['from'] || '';
  const to = headers['to'] || '';
  const date = headers['date'] || '';

  const parsed: EnronParsed = {
    file,
    from,
    to,
    subject,
    date,
    body,
    raw: cleanRaw
  };

  const isSent = file.includes('sent') || file.includes('sent_items');

  if (isSent && sentList.length < 50) {
    // Look for concise, direct responses
    if (body.length >= 60 && body.length <= 450) {
      sentList.push(parsed);
    }
  } else if (!isSent && inboxList.length < 150) {
    inboxList.push(parsed);
  }
}

async function testScan() {
  console.log('Testing Enron extraction from emails.csv...');
  const { inbox, sent } = await extractEnronData(8000);
  console.log(`Found ${inbox.length} inbox candidates and ${sent.length} sent candidates.`);

  if (inbox.length > 0) {
    console.log('\nSample Inbox Record:');
    console.log('File:', inbox[0].file);
    console.log('Subject:', inbox[0].subject);
    console.log('Body:', inbox[0].body);
  }

  if (sent.length > 0) {
    console.log('\nSample Sent Record:');
    console.log('File:', sent[0].file);
    console.log('Subject:', sent[0].subject);
    console.log('Body:', sent[0].body);
  }
}

testScan().catch(console.error);
