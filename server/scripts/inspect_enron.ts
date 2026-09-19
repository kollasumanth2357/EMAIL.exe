import fs from 'fs';
import readline from 'readline';

async function main() {
  const filePath = 'C:/Users/HP/Downloads/archive/emails.csv';
  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    return;
  }

  const stat = fs.statSync(filePath);
  console.log(`File size: ${(stat.size / (1024 * 1024)).toFixed(2)} MB`);

  const stream = fs.createReadStream(filePath, { encoding: 'utf8', highWaterMark: 64 * 1024 });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let lineCount = 0;
  let records: { file: string; headers: Record<string, string>; body: string }[] = [];
  let currentRecord: { file: string; raw: string } | null = null;

  for await (const line of rl) {
    lineCount++;

    // Check if new CSV row starts: "file","Message-ID: ...
    // Note: each row in emails.csv starts with "username/...","Message-ID:
    const match = line.match(/^"([^"]+)","(Message-ID:.*)$/);
    if (match) {
      if (currentRecord) {
        parseAndStore(currentRecord, records);
      }
      currentRecord = { file: match[1], raw: match[2] };
    } else if (currentRecord) {
      currentRecord.raw += '\n' + line;
    }

    if (records.length >= 20) break;
  }

  if (currentRecord && records.length < 20) {
    parseAndStore(currentRecord, records);
  }

  console.log(`Scanned ${lineCount} lines, collected ${records.length} records.`);
  records.slice(0, 5).forEach((r, i) => {
    console.log(`\n--- RECORD #${i + 1} ---`);
    console.log('File:', r.file);
    console.log('From:', r.headers['from']);
    console.log('To:', r.headers['to']);
    console.log('Subject:', r.headers['subject']);
    console.log('Date:', r.headers['date']);
    console.log('Body snippet:', JSON.stringify(r.body.slice(0, 150)));
  });
}

function parseAndStore(rec: { file: string; raw: string }, list: any[]) {
  // raw ends with a closing quote, trim it
  let cleanRaw = rec.raw;
  if (cleanRaw.endsWith('"')) cleanRaw = cleanRaw.slice(0, -1);

  // Split headers and body at \n\n
  const headerEnd = cleanRaw.indexOf('\n\n');
  const headerStr = headerEnd !== -1 ? cleanRaw.slice(0, headerEnd) : cleanRaw;
  const body = headerEnd !== -1 ? cleanRaw.slice(headerEnd + 2).trim() : '';

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

  list.push({ file: rec.file, headers, body });
}

main().catch(console.error);
