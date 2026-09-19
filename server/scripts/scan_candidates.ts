import fs from 'fs';
import readline from 'readline';

interface RawRecord {
  file: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  body: string;
}

async function scan() {
  const filePath = 'C:/Users/HP/Downloads/archive/emails.csv';
  const stream = fs.createReadStream(filePath, { encoding: 'utf8', highWaterMark: 128 * 1024 });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let lineCount = 0;
  let recordCount = 0;
  let currentFile = '';
  let currentRaw = '';

  const candidates: RawRecord[] = [];

  for await (const line of rl) {
    lineCount++;
    const match = line.match(/^"([^"]+)","(Message-ID:.*)$/);

    if (match) {
      if (currentFile && currentRaw) {
        checkAndAdd(currentFile, currentRaw, candidates);
        recordCount++;
      }
      currentFile = match[1];
      currentRaw = match[2];
    } else if (currentFile) {
      currentRaw += '\n' + line;
    }

    if (candidates.length >= 60 || recordCount > 50000) break;
  }

  if (currentFile && currentRaw) {
    checkAndAdd(currentFile, currentRaw, candidates);
  }

  console.log(`Scanned ${recordCount} records (${lineCount} lines). Found ${candidates.length} strong candidates.`);
  candidates.slice(0, 10).forEach((c, idx) => {
    console.log(`\nCandidate #${idx + 1} (${c.file}):`);
    console.log(`Subject: ${c.subject}`);
    console.log(`From: ${c.from} -> To: ${c.to}`);
    console.log(`Snippet: ${c.body.slice(0, 180).replace(/\n/g, ' ')}`);
  });
}

function checkAndAdd(file: string, raw: string, list: RawRecord[]) {
  let cleanRaw = raw;
  if (cleanRaw.endsWith('"')) cleanRaw = cleanRaw.slice(0, -1);

  const headerEnd = cleanRaw.indexOf('\n\n');
  const headerStr = headerEnd !== -1 ? cleanRaw.slice(0, headerEnd) : cleanRaw;
  const body = headerEnd !== -1 ? cleanRaw.slice(headerEnd + 2).trim() : '';

  if (body.length < 50 || body.length > 800) return;
  if (body.includes('-----Original Message-----') && body.length > 600) return;

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

  const subject = headers['subject'] || '';
  if (!subject || subject.toLowerCase() === 're:' || subject.length < 4) return;
  if (subject.toLowerCase().includes('enron') && subject.toLowerCase().includes('bankruptcy')) return;

  const subLower = subject.toLowerCase();
  const bodyLower = body.toLowerCase();

  const keywords = ['meeting', 'deadline', 'schedule', 'project', 'update', 'review', 'budget', 'approval', 'report', 'contract', 'status'];
  const hasKw = keywords.some(k => subLower.includes(k) || bodyLower.includes(k));

  if (hasKw) {
    list.push({
      file,
      from: headers['from'] || '',
      to: headers['to'] || '',
      subject,
      date: headers['date'] || '',
      body
    });
  }
}

scan().catch(console.error);
