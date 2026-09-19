import { parseCsvBuffer } from '../src/utils/csv.js';

async function test() {
  const sampleCsv = Buffer.from('sender,subject,body\nrahul@techflow.io,Sync,"Hi Sai, can we meet tomorrow, at 3 PM?"\nprof@univ.edu,Deadline,"Final project deadline moved to Friday, please test before Thursday."');
  const rows = await parseCsvBuffer(sampleCsv);
  console.log('Parsed Rows:', rows);
  if (rows[0].body === 'Hi Sai, can we meet tomorrow, at 3 PM?') {
    console.log('✓ CSV parser test passed! Comma within quotes preserved accurately.');
  } else {
    console.error('❌ Failed to preserve comma in quotes');
    process.exit(1);
  }
}

test();
