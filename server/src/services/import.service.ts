import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { supabase, checkSupabaseHealth } from '../config/supabase.js';
import { store } from './store.service.js';
import { parseCsvBuffer } from '../utils/csv.js';
import { Email, SentEmail, Thread, ThreadMessage, Priority, Topic } from '../types/index.js';
import { logger } from '../utils/logger.js';

const log = logger.child('Import');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ImportStats {
  imported: number;
  skipped: number;
  duplicates: number;
  inbox: number;
  sent: number;
  threads: number;
  errors: number;
  validationErrors?: string[];
}

export interface ParsedEmailRecord {
  id?: string;
  sender: string;
  senderName: string;
  recipient: string;
  subject: string;
  normalizedSubject: string;
  body: string;
  timestamp: string;
  isSent: boolean;
  isRead?: boolean;
  messageId?: string;
  rawFile?: string;
}

export class ImportService {
  /**
   * Validates email address format
   */
  public isValidEmailAddress(emailStr: string): boolean {
    if (!emailStr || typeof emailStr !== 'string') return false;
    const clean = emailStr.trim();
    if (clean.length < 3 || clean.length > 254) return false;
    return clean.includes('@') && !clean.includes(' ') && clean.indexOf('@') > 0;
  }

  /**
   * Normalizes subject line by stripping common prefix markers like Re:, Fwd:, FW:, etc.
   */
  public normalizeSubject(subject: string): string {
    if (!subject || typeof subject !== 'string') return 'No Subject';
    let clean = subject.trim();
    if (clean.length > 300) clean = clean.slice(0, 300);
    // Repeatedly strip prefixes
    const prefixRegex = /^(re|fwd|fw|re\[\d+\]|fwd\[\d+\])\s*:\s*/i;
    while (prefixRegex.test(clean)) {
      clean = clean.replace(prefixRegex, '').trim();
    }
    return clean || 'No Subject';
  }

  /**
   * Cleans body text, removing forwarded header noise, phone numbers, and Enron artifacts
   */
  public cleanBody(rawBody: string): string {
    if (!rawBody || typeof rawBody !== 'string') return '';
    let b = rawBody.trim();
    if (b.length > 500000) b = b.slice(0, 500000); // 500KB cap per email body

    // Strip forwarded headers block
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

    // Strip -----Original Message----- block
    if (b.includes('-----Original Message-----')) {
      b = b.slice(0, b.indexOf('-----Original Message-----')).trim();
    }

    // Sanitize phone numbers
    b = b.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[phone]');

    // Normalize Enron domains to demo domain
    b = b.replace(/@enron\.com/gi, '@mailpilot.demo');
    b = b.replace(/@ECT\b/gi, '');
    b = b.replace(/@ENRON\b/gi, '');
    b = b.replace(/@EnronXGate/gi, '');

    return b.trim();
  }

  /**
   * Extracts formatted name from email and optional X-From header
   */
  public extractSenderName(from: string, xFrom?: string): string {
    if (xFrom && typeof xFrom === 'string' && xFrom.trim().length > 0) {
      let name = xFrom.split('<')[0].replace(/["']/g, '').trim();
      if (name.includes('/')) name = name.split('/')[0].trim();
      if (name.length > 2 && name.length < 40) return name;
    }
    const local = from ? (from.split('@')[0] || 'Unknown') : 'Unknown';
    const parts = local.split('.').map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase());
    return parts.join(' ');
  }

  /**
   * Generates a stable deterministic ID for deduplication
   */
  public generateDeterministicId(rec: { messageId?: string; from: string; subject: string; date: string; body: string }): string {
    if (rec.messageId && rec.messageId.trim()) {
      const cleanMsgId = rec.messageId.replace(/[<>\s]/g, '').trim();
      const hash = crypto.createHash('md5').update(cleanMsgId).digest('hex').slice(0, 12);
      return `enron_${hash}`;
    }
    const signature = `${rec.from}_${this.normalizeSubject(rec.subject)}_${rec.date}_${(rec.body || '').slice(0, 50)}`;
    const hash = crypto.createHash('md5').update(signature).digest('hex').slice(0, 12);
    return `em_${hash}`;
  }

  /**
   * Parses raw RFC 822 email text into structured fields with strict validation
   */
  public parseRFC822(rawText: string, filePath: string = ''): ParsedEmailRecord | null {
    if (!rawText || typeof rawText !== 'string' || !rawText.trim()) return null;

    let cleanRaw = rawText.trim();
    if (cleanRaw.startsWith('"') && cleanRaw.endsWith('"')) {
      cleanRaw = cleanRaw.slice(1, -1);
    }

    const headerEnd = cleanRaw.indexOf('\n\n');
    const headerStr = headerEnd !== -1 ? cleanRaw.slice(0, headerEnd) : cleanRaw;
    const rawBody = headerEnd !== -1 ? cleanRaw.slice(headerEnd + 2) : '';

    const headers: Record<string, string> = {};
    const lines = headerStr.split('\n');
    let lastKey = '';

    for (const line of lines) {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0 && !line.startsWith(' ') && !line.startsWith('\t')) {
        lastKey = line.slice(0, colonIdx).trim().toLowerCase();
        headers[lastKey] = line.slice(colonIdx + 1).trim();
      } else if (lastKey) {
        headers[lastKey] += ' ' + line.trim();
      }
    }

    const rawFrom = headers['from'] || 'unknown@mailpilot.demo';
    const rawTo = headers['to'] || 'sai@mailpilot.demo';

    const from = rawFrom.toLowerCase().replace(/@enron\.com/gi, '@mailpilot.demo');
    const to = rawTo.toLowerCase().replace(/@enron\.com/gi, '@mailpilot.demo');
    const subject = headers['subject'] || 'No Subject';
    const messageId = headers['message-id'] || '';
    const dateStr = headers['date'] || new Date().toISOString();
    const senderName = this.extractSenderName(from, headers['x-from']);
    const body = this.cleanBody(rawBody);

    if (!body || body.length < 10) {
      return null;
    }

    // Determine inbox vs sent
    const isSent = filePath.toLowerCase().includes('sent') ||
      filePath.toLowerCase().includes('sent_items') ||
      filePath.toLowerCase().includes('_sent_mail') ||
      from.includes('sai@');

    const id = this.generateDeterministicId({ messageId, from, subject, date: dateStr, body });

    let timestamp: string;
    try {
      const parsedDate = new Date(dateStr);
      timestamp = isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString();
    } catch {
      timestamp = new Date().toISOString();
    }

    return {
      id,
      sender: from,
      senderName,
      recipient: to,
      subject,
      normalizedSubject: this.normalizeSubject(subject),
      body,
      timestamp,
      isSent,
      messageId,
      rawFile: filePath
    };
  }

  /**
   * Processes an uploaded file (CSV or JSON) or structured array with validation
   */
  public async processUpload(options: {
    fileBuffer?: Buffer;
    fileName?: string;
    jsonBody?: any;
    limit?: number;
  }): Promise<{ stats: ImportStats; sampleEmails: ParsedEmailRecord[] }> {
    const limit = options.limit || 100;
    let records: ParsedEmailRecord[] = [];
    const validationErrors: string[] = [];

    // 1. Check if buffer provided
    if (options.fileBuffer && options.fileName) {
      const name = options.fileName.toLowerCase();

      if (name.endsWith('.csv')) {
        const rows = await parseCsvBuffer(options.fileBuffer);

        for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
          if (records.length >= limit) break;
          const row = rows[rowIndex];

          try {
            // Case A: Standard Enron CSV with "file" and "message"
            if (row['message'] || row['Message']) {
              const rawMsg = row['message'] || row['Message'];
              const file = row['file'] || row['File'] || '';
              const parsed = this.parseRFC822(rawMsg, file);
              if (parsed) {
                records.push(parsed);
              } else {
                validationErrors.push(`Row ${rowIndex + 1}: empty or unparseable RFC822 message content`);
              }
            }
            // Case B: Generic CSV with sender, recipient, subject, body
            else if (row['body'] || row['Body'] || row['subject'] || row['Subject']) {
              const rawSender = (row['sender'] || row['from'] || row['From'] || 'colleague@mailpilot.demo').trim();
              const rawRecipient = (row['recipient'] || row['to'] || row['To'] || 'sai@mailpilot.demo').trim();
              const sender = this.isValidEmailAddress(rawSender) ? rawSender : 'colleague@mailpilot.demo';
              const recipient = this.isValidEmailAddress(rawRecipient) ? rawRecipient : 'sai@mailpilot.demo';
              const subject = (row['subject'] || row['Subject'] || 'No Subject').trim();
              const body = this.cleanBody(row['body'] || row['Body'] || row['content'] || '');
              const dateStr = row['timestamp'] || row['date'] || row['Date'] || new Date().toISOString();

              if (body.length >= 10) {
                const id = this.generateDeterministicId({ from: sender, subject, date: dateStr, body });
                let timestamp = new Date().toISOString();
                try {
                  const d = new Date(dateStr);
                  if (!isNaN(d.getTime())) timestamp = d.toISOString();
                } catch {
                  timestamp = new Date().toISOString();
                }

                records.push({
                  id,
                  sender,
                  senderName: this.extractSenderName(sender),
                  recipient,
                  subject,
                  normalizedSubject: this.normalizeSubject(subject),
                  body,
                  timestamp,
                  isSent: sender.includes('sai@')
                });
              } else {
                validationErrors.push(`Row ${rowIndex + 1}: message body too short or empty (< 10 chars)`);
              }
            } else {
              validationErrors.push(`Row ${rowIndex + 1}: missing recognizable email columns`);
            }
          } catch (rowErr: any) {
            validationErrors.push(`Row ${rowIndex + 1}: parsing error - ${rowErr.message}`);
          }
        }
      } else if (name.endsWith('.json')) {
        const content = options.fileBuffer.toString('utf8');
        try {
          const parsed = JSON.parse(content);
          records = this.parseJsonStructure(parsed, limit);
        } catch (jsonErr: any) {
          throw new Error(`Malformed JSON file: ${jsonErr.message}`);
        }
      }
    } else if (options.jsonBody) {
      records = this.parseJsonStructure(options.jsonBody, limit);
    }

    log.info(`Processed upload: parsed ${records.length} valid records, ${validationErrors.length} validation notices.`);

    // 2. Persist records and build threads
    const stats = await this.persistNormalizedRecords(records);
    if (validationErrors.length > 0) {
      stats.validationErrors = validationErrors.slice(0, 10);
    }
    return {
      stats,
      sampleEmails: records.slice(0, 5)
    };
  }

  /**
   * Helper to parse any JSON structure (enron_pool.json, array of emails, or { emails, sentEmails })
   */
  public parseJsonStructure(data: any, limit: number = 100): ParsedEmailRecord[] {
    const list: ParsedEmailRecord[] = [];

    // Case 1: enron_pool.json format { inbox: [...], sent: [...] }
    if (data && (Array.isArray(data.inbox) || Array.isArray(data.sent))) {
      const inboxes = Array.isArray(data.inbox) ? data.inbox : [];
      const sents = Array.isArray(data.sent) ? data.sent : [];

      // Allocate proportional quota so both inbox and sent pools are ingested
      const inboxLimit = Math.min(inboxes.length, Math.ceil(limit * 0.65));
      const sentLimit = Math.min(sents.length, Math.max(1, limit - inboxLimit));

      for (let i = 0; i < inboxes.length && i < inboxLimit; i++) {
        const item = inboxes[i];
        const from = (item.from || 'unknown@mailpilot.demo').toLowerCase().replace(/@enron\.com/gi, '@mailpilot.demo');
        const to = (item.to || 'sai@mailpilot.demo').toLowerCase().replace(/@enron\.com/gi, '@mailpilot.demo');
        const subject = item.subject || 'No Subject';
        const body = this.cleanBody(item.body || '');
        const dateStr = item.date || item.timestamp || new Date().toISOString();
        const id = this.generateDeterministicId({ from, subject, date: dateStr, body });

        list.push({
          id,
          sender: from,
          senderName: item.senderName || this.extractSenderName(from),
          recipient: to,
          subject,
          normalizedSubject: this.normalizeSubject(subject),
          body,
          timestamp: new Date(dateStr).toISOString(),
          isSent: false,
          rawFile: item.file
        });
      }

      for (let i = 0; i < sents.length && i < sentLimit; i++) {
        const item = sents[i];
        const from = (item.from || 'sai@mailpilot.demo').toLowerCase().replace(/@enron\.com/gi, '@mailpilot.demo');
        const to = (item.to || 'colleague@mailpilot.demo').toLowerCase().replace(/@enron\.com/gi, '@mailpilot.demo');
        const subject = item.subject || 'No Subject';
        const body = this.cleanBody(item.body || '');
        const dateStr = item.date || item.timestamp || new Date().toISOString();
        const id = this.generateDeterministicId({ from, subject, date: dateStr, body });

        list.push({
          id,
          sender: from,
          senderName: item.senderName || 'Sai',
          recipient: to,
          subject,
          normalizedSubject: this.normalizeSubject(subject),
          body,
          timestamp: new Date(dateStr).toISOString(),
          isSent: true,
          rawFile: item.file
        });
      }
      return list;
    }

    // Case 2: Array of items
    const rawArray = Array.isArray(data) ? data : Array.isArray(data.emails) ? data.emails : [];
    for (const item of rawArray) {
      if (list.length >= limit) break;
      const from = item.sender || item.from || 'colleague@mailpilot.demo';
      const to = item.recipient || item.to || 'sai@mailpilot.demo';
      const subject = item.subject || 'No Subject';
      const body = this.cleanBody(item.body || item.content || '');
      const dateStr = item.timestamp || item.date || new Date().toISOString();
      const id = this.generateDeterministicId({ from, subject, date: dateStr, body });

      list.push({
        id,
        sender: from,
        senderName: item.sender_name || item.senderName || this.extractSenderName(from),
        recipient: to,
        subject,
        normalizedSubject: this.normalizeSubject(subject),
        body,
        timestamp: new Date(dateStr).toISOString(),
        isSent: item.isSent || item.status === 'sent' || from.includes('sai@')
      });
    }

    return list;
  }

  /**
   * Loads the included Enron sample pool from server/scripts/enron_pool.json directly
   */
  public async loadEnronSample(limit: number = 75): Promise<ImportStats> {
    const poolPath = path.resolve(__dirname, '../../scripts/enron_pool.json');
    if (!fs.existsSync(poolPath)) {
      throw new Error('enron_pool.json not found at ' + poolPath);
    }

    const raw = fs.readFileSync(poolPath, 'utf8');
    const data = JSON.parse(raw);
    const records = this.parseJsonStructure(data, limit);
    return await this.persistNormalizedRecords(records);
  }

  /**
   * Groups emails into threads by normalized subject and stores them in Supabase PostgreSQL
   */
  public async persistNormalizedRecords(records: ParsedEmailRecord[]): Promise<ImportStats> {
    const stats: ImportStats = {
      imported: 0,
      skipped: 0,
      duplicates: 0,
      inbox: 0,
      sent: 0,
      threads: 0,
      errors: 0
    };

    if (!records || records.length === 0) {
      return stats;
    }

    // Step 1: Thread Grouping Map by normalized subject
    const threadMap = new Map<string, ParsedEmailRecord[]>();
    for (const rec of records) {
      const normSub = rec.normalizedSubject || 'General Conversation';
      if (!threadMap.has(normSub)) {
        threadMap.set(normSub, []);
      }
      threadMap.get(normSub)!.push(rec);
    }

    stats.threads = threadMap.size;

    // Connect to Supabase if healthy
    const isHealthy = (await checkSupabaseHealth()).available;

    // Load existing IDs to detect duplicates
    const existingEmailIds = new Set<string>();
    const existingSentIds = new Set<string>();

    if (isHealthy && supabase) {
      try {
        const { data: eData } = await supabase.from('emails').select('id');
        if (eData) eData.forEach((e) => existingEmailIds.add(e.id));

        const { data: sData } = await supabase.from('sent_emails').select('id');
        if (sData) sData.forEach((s) => existingSentIds.add(s.id));
      } catch (err) {
        console.warn('[Import] Could not fetch existing IDs for duplicate check:', err);
      }
    }

    const emailsToUpsert: Email[] = [];
    const sentToUpsert: SentEmail[] = [];
    const threadsToUpsert: Thread[] = [];
    const threadMessagesToUpsert: ThreadMessage[] = [];

    // Step 2: Iterate Threads and prepare entities
    for (const [normSubject, msgs] of threadMap.entries()) {
      // Sort messages chronologically
      msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      // Create stable thread ID from normalized subject
      const threadHash = crypto.createHash('md5').update(normSubject.toLowerCase()).digest('hex').slice(0, 10);
      const threadId = `th_${threadHash}`;

      const threadMessages: ThreadMessage[] = msgs.map((m, idx) => ({
        id: `tm_${m.id || idx}`,
        thread_id: threadId,
        sender: m.sender,
        sender_name: m.senderName,
        recipient: m.recipient,
        subject: m.subject,
        body: m.body,
        timestamp: m.timestamp
      }));

      const latestMsg = msgs[msgs.length - 1];

      // Prepare Thread entity
      const threadEntity: Thread = {
        id: threadId,
        subject: normSubject,
        summary: msgs.length > 1
          ? `Conversation regarding ${normSubject} with ${msgs.length} messages.\nLast activity from ${latestMsg.senderName}.`
          : (latestMsg.body.slice(0, 120) + '...'),
        message_count: msgs.length,
        last_message_at: latestMsg.timestamp,
        messages: threadMessages
      };

      threadsToUpsert.push(threadEntity);
      threadMessagesToUpsert.push(...threadMessages);

      // Separate into Inbox vs Sent
      for (const m of msgs) {
        if (m.isSent) {
          if (existingSentIds.has(m.id!)) {
            stats.duplicates++;
            stats.skipped++;
            continue;
          }

          const sentEntity: SentEmail = {
            id: m.id!,
            original_email_id: '',
            recipient: m.recipient,
            subject: m.subject,
            body: m.body,
            sent_at: m.timestamp,
            status: 'Sent'
          };

          sentToUpsert.push(sentEntity);
          existingSentIds.add(m.id!);
          stats.sent++;
          stats.imported++;
        } else {
          if (existingEmailIds.has(m.id!)) {
            stats.duplicates++;
            stats.skipped++;
            continue;
          }

          // Initial triage heuristic for imported emails
          let priority: Priority = 'Normal';
          let topic: Topic = 'Work';
          const subLower = m.subject.toLowerCase();
          const bodyLower = m.body.toLowerCase();

          if (subLower.includes('urgent') || subLower.includes('critical') || bodyLower.includes('immediately')) {
            priority = 'Urgent';
            topic = 'Action Required';
          } else if (subLower.includes('meeting') || subLower.includes('schedule') || subLower.includes('review')) {
            topic = 'Action Required';
          } else if (bodyLower.includes('newsletter') || subLower.includes('digest')) {
            priority = 'Low';
            topic = 'Newsletter';
          }

          const emailEntity: Email = {
            id: m.id!,
            thread_id: threadId,
            sender: m.sender,
            sender_name: m.senderName,
            recipient: m.recipient,
            subject: m.subject,
            body: m.body,
            timestamp: m.timestamp,
            priority,
            topic,
            summary: threadEntity.summary,
            is_read: typeof m.isRead === 'boolean' ? m.isRead : false,
            status: 'inbox',
            messages: threadMessages,
            created_at: m.timestamp
          };

          emailsToUpsert.push(emailEntity);
          existingEmailIds.add(m.id!);
          stats.inbox++;
          stats.imported++;
        }
      }
    }

    // Step 3: Insert into Supabase PostgreSQL
    if (isHealthy && supabase) {
      try {
        // Upsert Threads
        for (const t of threadsToUpsert) {
          await supabase.from('threads').upsert({
            id: t.id,
            subject: t.subject,
            summary: t.summary,
            message_count: t.message_count,
            last_message_at: t.last_message_at,
            created_at: new Date().toISOString()
          });
        }

        // Upsert Thread Messages
        for (const tm of threadMessagesToUpsert) {
          await supabase.from('thread_messages').upsert({
            id: tm.id,
            thread_id: tm.thread_id,
            sender: tm.sender,
            sender_name: tm.sender_name,
            recipient: tm.recipient,
            subject: tm.subject,
            body: tm.body,
            timestamp: tm.timestamp,
            created_at: new Date().toISOString()
          });
        }

        // Upsert Inbox Emails
        for (const e of emailsToUpsert) {
          await supabase.from('emails').upsert({
            id: e.id,
            thread_id: e.thread_id,
            sender: e.sender,
            sender_name: e.sender_name,
            recipient: e.recipient,
            subject: e.subject,
            body: e.body,
            timestamp: e.timestamp,
            priority: e.priority,
            topic: e.topic,
            summary: e.summary,
            is_read: e.is_read,
            status: e.status,
            created_at: e.created_at
          });
        }

        // Upsert Sent Emails
        for (const s of sentToUpsert) {
          await supabase.from('sent_emails').upsert({
            id: s.id,
            original_email_id: s.original_email_id || null,
            recipient: s.recipient,
            subject: s.subject,
            body: s.body,
            sent_at: s.sent_at,
            status: s.status
          });
        }

        console.log(`[Import] Persisted ${emailsToUpsert.length} emails, ${sentToUpsert.length} sent, ${threadsToUpsert.length} threads to Supabase.`);
      } catch (err: any) {
        console.error('[Import] Supabase persistence error:', err);
        stats.errors++;
      }
    }

    // Also update local fallback store so local file mirror stays synchronized
    try {
      await store.importEmails(emailsToUpsert, sentToUpsert);
    } catch (err) {
      console.warn('[Import] Local store mirror update error:', err);
    }

    return stats;
  }
}

export const importService = new ImportService();
