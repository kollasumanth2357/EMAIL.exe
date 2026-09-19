import csv from 'csv-parser';
import { Readable } from 'stream';

/**
 * Parses a CSV buffer using the csv-parser library.
 * Properly handles quoted fields, internal commas, escaped quotes, and multiline content.
 */
export async function parseCsvBuffer(buffer: Buffer): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const results: Record<string, string>[] = [];
    const stream = Readable.from(buffer);

    stream
      .pipe(csv({
        mapHeaders: ({ header }) => header.trim().replace(/^["']|["']$/g, ''),
        mapValues: ({ value }) => typeof value === 'string' ? value.trim() : value
      }))
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (err) => reject(err));
  });
}
