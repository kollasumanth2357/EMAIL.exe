import { Router, Request, Response } from 'express';
import multer from 'multer';
import { store } from '../services/store.service.js';
import { aiService } from '../services/ai.service.js';
import { importService } from '../services/import.service.js';
import { gmailService } from '../services/gmail.service.js';
import { parseCsvBuffer } from '../utils/csv.js';
import { hashPassword } from '../utils/auth.js';

const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } });
const router = Router();

/**
 * Helper to identify whether the current incoming request is within a Demo Mode session
 */
export function isDemoRequest(req: Request): boolean {
  return (
    req.headers['x-is-demo'] === 'true' ||
    req.query.is_demo === 'true' ||
    req.query.source === 'demo' ||
    req.body?.isDemo === true ||
    req.body?.is_demo === true
  );
}

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

// POST /api/auth/register
router.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Full name is required.' });
    }
    if (!email || typeof email !== 'string' || !email.trim() || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'A valid email address is required.' });
    }
    if (!password || typeof password !== 'string' || password.length < 4) {
      return res.status(400).json({ success: false, error: 'Password must be at least 4 characters.' });
    }

    const passwordHash = hashPassword(password);
    const user = await store.createUser(name.trim(), email.trim(), passwordHash);

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Registration failed.' });
  }
});

// POST /api/auth/login
router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Invalid email or password.' });
    }

    const result = await store.authenticateUser(email, password);
    if (!result.success || !result.user) {
      return res.status(401).json({ success: false, error: result.error || 'Invalid email or password.' });
    }

    res.json({
      success: true,
      user: result.user
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Authentication error: ' + err.message });
  }
});

// POST /api/auth/demo
router.post('/auth/demo', async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      user: {
        id: 'user-sai',
        name: 'Sai',
        email: 'sai@mailpilot.demo',
        isDemo: true
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 1. GET /api/emails
router.get('/emails', async (req: Request, res: Response) => {
  try {
    const isDemo = isDemoRequest(req);
    const priority = req.query.priority as string | undefined;
    const topic = req.query.topic as string | undefined;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const source = (req.query.source as string) || (isDemo ? 'demo' : undefined);

    const emails = await store.getEmails({ priority, topic, status, search, source, isDemo });
    res.json({ success: true, emails });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. GET /api/emails/:id
router.get('/emails/:id', async (req: Request, res: Response) => {
  try {
    const emailId = req.params.id as string;
    const isDemo = isDemoRequest(req);

    // In demo session, ensure real Gmail records are strictly inaccessible
    if (isDemo && emailId.startsWith('gmail_') && !emailId.startsWith('gmail_msg_')) {
      return res.status(404).json({ success: false, error: 'Email not found in demo workspace' });
    }

    const isRealGmail = !isDemo && emailId.startsWith('gmail_') && !emailId.startsWith('gmail_msg_');

    // For real Gmail messages, do NOT auto-mark read locally until Gmail API confirms
    const email = await store.getEmailById(emailId, !isRealGmail);
    if (!email) {
      return res.status(404).json({ success: false, error: 'Email not found' });
    }

    let markReadError: string | undefined;
    let verifiedRead = email.is_read;

    // Real Gmail: Synchronously modify UNREAD label in Gmail and verify removal
    if (isRealGmail && gmailService.isAuthenticated()) {
      const gmailMsgId = email.id.replace(/^gmail_/, '');
      try {
        const readResult = await gmailService.markMessageAsRead(gmailMsgId);
        if (readResult.verifiedRead) {
          // ONLY update local state AFTER Gmail confirms the removal of UNREAD
          await store.updateEmail(email.id, { is_read: true });
          email.is_read = true;
          verifiedRead = true;
        }
      } catch (readErr: any) {
        markReadError = readErr.message;
        console.error(`[API] Could not mark real Gmail message ${email.id} as read:`, readErr.message);
      }
    }

    // Fetch thread if exists
    let thread = await store.getThreadById(email.thread_id);
    const draft = await store.getDraftByEmailId(email.id);

    res.json({
      success: true,
      email,
      markReadError: markReadError || null,
      verifiedRead,
      thread: thread || {
        id: email.thread_id,
        subject: email.subject,
        summary: email.summary,
        message_count: email.messages ? email.messages.length : 1,
        last_message_at: email.timestamp,
        messages: email.messages || []
      },
      draft: draft || null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2b. POST /api/emails/:id/mark-read
router.post('/emails/:id/mark-read', async (req: Request, res: Response) => {
  try {
    const emailId = req.params.id as string;
    const isDemo = isDemoRequest(req);
    const isRealGmail = !isDemo && emailId.startsWith('gmail_') && !emailId.startsWith('gmail_msg_');

    const email = await store.getEmailById(emailId, false);
    if (!email) {
      return res.status(404).json({ success: false, error: 'Email not found' });
    }

    if (isRealGmail) {
      if (!gmailService.isAuthenticated()) {
        return res.status(400).json({
          success: false,
          error: 'Gmail is not connected. Please connect your Gmail account in Settings.'
        });
      }

      const gmailMsgId = email.id.replace(/^gmail_/, '');
      const readResult = await gmailService.markMessageAsRead(gmailMsgId);
      if (!readResult.verifiedRead) {
        return res.status(500).json({
          success: false,
          error: 'Gmail API failed to remove UNREAD label.'
        });
      }
    }

    const updated = await store.updateEmail(emailId, { is_read: true });
    res.json({
      success: true,
      email: updated || { ...email, is_read: true },
      verifiedGmailRead: isRealGmail
    });
  } catch (err: any) {
    console.error(`[API] mark-read failed for ${req.params.id}:`, err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. POST /api/emails/load-demo
router.post('/emails/load-demo', async (req: Request, res: Response) => {
  try {
    const result = await store.resetToDemo();
    res.json({
      success: true,
      message: 'Demo dataset loaded successfully',
      ...result
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4a. POST /api/import (Handles CSV or JSON upload with RFC 822 parsing, thread grouping, and deduplication)
router.post('/import', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const limit = req.body?.limit ? parseInt(req.body.limit, 10) : 100;
    const result = await importService.processUpload({
      fileBuffer: req.file?.buffer,
      fileName: req.file?.originalname,
      jsonBody: req.body,
      limit
    });

    res.json({
      success: true,
      message: `Imported ${result.stats.imported} records (${result.stats.inbox} inbox, ${result.stats.sent} sent) across ${result.stats.threads} threads`,
      stats: result.stats,
      sample: result.sampleEmails
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: 'Import failed: ' + err.message });
  }
});

// 4b. POST /api/import/enron-sample (1-click load of enron_pool.json)
router.post('/import/enron-sample', async (req: Request, res: Response) => {
  try {
    const limit = req.body?.limit ? parseInt(req.body.limit, 10) : 75;
    const stats = await importService.loadEnronSample(limit);

    res.json({
      success: true,
      message: `Enron sample dataset successfully imported (${stats.inbox} inbox, ${stats.sent} sent, ${stats.threads} threads)`,
      stats
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to load Enron sample: ' + err.message });
  }
});

// 4c. POST /api/emails/import (Backward compatibility alias)
router.post('/emails/import', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const result = await importService.processUpload({
      fileBuffer: req.file?.buffer,
      fileName: req.file?.originalname,
      jsonBody: req.body,
      limit: 100
    });

    res.json({
      success: true,
      message: 'Inbox data successfully imported',
      stats: result.stats,
      emailsImported: result.stats.inbox,
      sentImported: result.stats.sent,
      threadsDetected: result.stats.threads
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: 'Failed to parse file: ' + err.message });
  }
});


// Helper for controlled concurrency
async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += limit) {
    const chunk = items.slice(i, i + limit);
    const chunkResults = await Promise.all(chunk.map(fn));
    results.push(...chunkResults);
    if (i + limit < items.length) {
      await new Promise(res => setTimeout(res, 150));
    }
  }
  return results;
}

// 5a. POST /api/emails/analyze (Batch AI Triage with controlled concurrency = 3)
router.post('/emails/analyze', async (req: Request, res: Response) => {
  try {
    const maxEmails = req.body?.limit ? parseInt(req.body.limit, 10) : 50;
    const allEmails = await store.getEmails({ status: 'inbox' });
    const targetEmails = allEmails.slice(0, maxEmails);

    let successful = 0;
    let fallback = 0;
    let failed = 0;

    // Concurrency limit = 3 per requirements
    const CONCURRENCY_LIMIT = 3;

    await runWithConcurrency(targetEmails, CONCURRENCY_LIMIT, async (email) => {
      try {
        const classification = await aiService.classifyEmail(email, email.messages);
        await store.updateEmail(email.id, {
          priority: classification.priority,
          topic: classification.topic,
          summary: classification.summary
        });

        if (classification.isFallback) {
          fallback++;
        } else {
          successful++;
        }
      } catch (err) {
        console.error(`[AI Triage] Failed to triage email ${email.id}:`, err);
        failed++;
      }
    });

    const processed = targetEmails.length;

    res.json({
      success: true,
      processed,
      successful,
      fallback,
      failed,
      triagedCount: processed,
      message: `Batch triage complete. Processed ${processed} emails (${successful} AI, ${fallback} fallback).`
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5b. POST /api/emails/:id/triage (Single Email AI Triage)
router.post('/emails/:id/triage', async (req: Request, res: Response) => {
  try {
    const emailId = req.params.id as string;
    const email = await store.getEmailById(emailId);
    if (!email) {
      return res.status(404).json({ success: false, error: 'Email not found' });
    }

    const classification = await aiService.classifyEmail(email, email.messages);
    const updated = await store.updateEmail(emailId, {
      priority: classification.priority,
      topic: classification.topic,
      summary: classification.summary
    });

    res.json({
      success: true,
      email: updated || {
        ...email,
        priority: classification.priority,
        topic: classification.topic,
        summary: classification.summary
      },
      classification
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5d. POST /api/emails/bulk-triage (Selected emails AI Triage with concurrency = 3)
router.post('/emails/bulk-triage', async (req: Request, res: Response) => {
  try {
    const emailIds = req.body?.email_ids as string[] | undefined;
    if (!emailIds || !Array.isArray(emailIds) || emailIds.length === 0) {
      return res.status(400).json({ success: false, error: 'email_ids array is required and cannot be empty' });
    }

    const CONCURRENCY_LIMIT = 3;
    let successful = 0;
    let fallback = 0;
    let failed = 0;

    await runWithConcurrency(emailIds, CONCURRENCY_LIMIT, async (id) => {
      try {
        const email = await store.getEmailById(id);
        if (!email) {
          failed++;
          return;
        }

        const classification = await aiService.classifyEmail(email, email.messages);
        await store.updateEmail(email.id, {
          priority: classification.priority,
          topic: classification.topic,
          summary: classification.summary
        });

        if (classification.isFallback) {
          fallback++;
        } else {
          successful++;
        }
      } catch (err) {
        console.error(`[Bulk Triage] Failed to triage email ${id}:`, err);
        failed++;
      }
    });

    res.json({
      success: true,
      processed: emailIds.length,
      successful,
      fallback,
      failed,
      message: `Bulk AI triage completed for ${emailIds.length} emails (${successful} AI, ${fallback} fallback${failed > 0 ? `, ${failed} failed` : ''}).`
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5e. POST /api/emails/bulk-status (Selected emails mark read/unread or status update)
router.post('/emails/bulk-status', async (req: Request, res: Response) => {
  try {
    const { email_ids, is_read, status, priority, topic } = req.body || {};
    if (!email_ids || !Array.isArray(email_ids) || email_ids.length === 0) {
      return res.status(400).json({ success: false, error: 'email_ids array is required and cannot be empty' });
    }

    const patch: any = {};
    if (is_read !== undefined) patch.is_read = Boolean(is_read);
    if (status !== undefined) patch.status = status;
    if (priority !== undefined) patch.priority = priority;
    if (topic !== undefined) patch.topic = topic;

    const result = await store.bulkUpdateEmails(email_ids, patch);
    res.json({
      success: true,
      processed: email_ids.length,
      updatedCount: result.updatedCount,
      message: `Updated status for ${result.updatedCount} emails.`
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5c. POST /api/threads/:id/summarize (Thread 2-Line Summarization)
router.post('/threads/:id/summarize', async (req: Request, res: Response) => {
  try {
    const threadId = req.params.id as string;
    let thread = await store.getThreadById(threadId);
    if (!thread) {
      const emails = await store.getEmails();
      const matching = emails.find(e => e.thread_id === threadId);
      if (matching) {
        thread = {
          id: threadId,
          subject: matching.subject,
          summary: matching.summary,
          message_count: matching.messages ? matching.messages.length : 1,
          last_message_at: matching.timestamp,
          messages: matching.messages || []
        };
      }
    }
    if (!thread) {
      return res.status(404).json({ success: false, error: 'Thread not found' });
    }

    const threadMessages = thread.messages && thread.messages.length > 0
      ? thread.messages
      : [
          {
            id: `msg_${thread.id}`,
            thread_id: thread.id,
            sender: 'participant@mailpilot.demo',
            sender_name: 'Participant',
            recipient: 'sai@mailpilot.demo',
            subject: thread.subject,
            body: thread.summary || thread.subject,
            timestamp: thread.last_message_at || new Date().toISOString()
          }
        ];

    const result = await aiService.summarizeThread(threadMessages);
    const updated = await store.updateThread(threadId, { summary: result.summary });

    res.json({
      success: true,
      thread_id: threadId,
      summary: result.summary,
      thread: updated,
      isFallback: result.isFallback,
      modelUsed: result.modelUsed
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6a. POST /api/emails/:id/generate-reply (Generates contextual personalized reply draft)
router.post('/emails/:id/generate-reply', async (req: Request, res: Response) => {
  try {
    const email = await store.getEmailById(req.params.id as string);
    if (!email) {
      return res.status(404).json({ success: false, error: 'Email not found' });
    }

    const { tone, brevity, subject } = req.body || {};
    const toneVal = tone !== undefined ? Number(tone) : 3;

    const styleProfile = await store.getStyleProfile();
    const sentExamples = await store.getSentEmails();
    const thread = await store.getThreadById(email.thread_id);

    const generated = await aiService.generateReply(
      email,
      email.messages || thread?.messages,
      thread?.summary || email.summary,
      styleProfile,
      sentExamples,
      { tone: toneVal, brevity }
    );

    // Save as draft in Supabase
    const draft = await store.saveDraft(
      email.id,
      generated.content,
      generated.tone_match_scores,
      subject,
      toneVal
    );

    res.json({
      success: true,
      draft,
      styleProfile,
      isFallback: generated.isFallback,
      modelUsed: generated.modelUsed,
      toneUsed: toneVal
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6b. POST /api/drafts/generate (Body-based alias for draft generation)
router.post('/drafts/generate', async (req: Request, res: Response) => {
  try {
    const { email_id, tone, brevity, subject } = req.body || {};
    if (!email_id) {
      return res.status(400).json({ success: false, error: 'email_id is required' });
    }

    const email = await store.getEmailById(email_id);
    if (!email) {
      return res.status(404).json({ success: false, error: 'Email not found' });
    }

    const toneVal = tone !== undefined ? Number(tone) : 3;

    const styleProfile = await store.getStyleProfile();
    const sentExamples = await store.getSentEmails();
    const thread = await store.getThreadById(email.thread_id);

    const generated = await aiService.generateReply(
      email,
      email.messages || thread?.messages,
      thread?.summary || email.summary,
      styleProfile,
      sentExamples,
      { tone: toneVal, brevity }
    );

    const draft = await store.saveDraft(
      email.id,
      generated.content,
      generated.tone_match_scores,
      subject,
      toneVal
    );

    res.json({
      success: true,
      draft,
      styleProfile,
      isFallback: generated.isFallback,
      modelUsed: generated.modelUsed,
      toneUsed: toneVal
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6c. POST /api/drafts/:id/regenerate (Explicit regenerate draft action with tone parameter)
router.post('/drafts/:id/regenerate', async (req: Request, res: Response) => {
  try {
    const targetId = req.params.id as string;
    const { tone, brevity, subject } = req.body || {};

    let email = await store.getEmailById(targetId);
    if (!email) {
      const drafts = await store.getDrafts();
      const match = drafts.find(d => d.id === targetId);
      if (match) {
        email = await store.getEmailById(match.email_id);
      }
    }

    if (!email) {
      return res.status(404).json({ success: false, error: 'Target email for draft not found' });
    }

    const toneVal = tone !== undefined ? Number(tone) : 3;

    const styleProfile = await store.getStyleProfile();
    const sentExamples = await store.getSentEmails();
    const thread = await store.getThreadById(email.thread_id);

    const generated = await aiService.generateReply(
      email,
      email.messages || thread?.messages,
      thread?.summary || email.summary,
      styleProfile,
      sentExamples,
      { tone: toneVal, brevity }
    );

    const draft = await store.saveDraft(
      email.id,
      generated.content,
      generated.tone_match_scores,
      subject,
      toneVal
    );

    res.json({
      success: true,
      draft,
      styleProfile,
      isFallback: generated.isFallback,
      modelUsed: generated.modelUsed,
      toneUsed: toneVal
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. POST /api/drafts/:id/save & PUT /api/drafts/:id
const handleSaveDraft = async (req: Request, res: Response) => {
  try {
    const { email_id, content, subject, tone, tone_match_scores } = req.body || {};
    if (typeof content !== 'string') {
      return res.status(400).json({ success: false, error: 'content is required' });
    }

    let targetEmailId = email_id;
    if (!targetEmailId) {
      const drafts = await store.getDrafts();
      const match = drafts.find(d => d.id === req.params.id || d.email_id === req.params.id);
      targetEmailId = match ? match.email_id : req.params.id;
    }

    const saved = await store.saveDraft(targetEmailId, content, tone_match_scores, subject, tone);
    res.json({ success: true, draft: saved });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

router.post('/drafts/:id/save', handleSaveDraft);
router.put('/drafts/:id', handleSaveDraft);

// 8. POST /api/drafts/:id/send (Approve & Send: Dispatches to Gmail API first for real emails)
router.post('/drafts/:id/send', async (req: Request, res: Response) => {
  try {
    const { email_id, content, subject } = req.body || {};
    let targetEmailId = email_id;

    if (!targetEmailId) {
      const drafts = await store.getDrafts();
      const match = drafts.find(d => d.id === req.params.id || d.email_id === req.params.id);
      targetEmailId = match ? match.email_id : req.params.id;
    }

    if (!targetEmailId) {
      return res.status(400).json({ success: false, error: 'email_id is required' });
    }

    if (content !== undefined && typeof content === 'string' && !content.trim()) {
      return res.status(400).json({ success: false, error: 'Draft content cannot be empty' });
    }

    // 1. Fetch original email to verify existence and check status
    const originalEmail = await store.getEmailById(targetEmailId, false);
    if (!originalEmail) {
      return res.status(404).json({ success: false, error: 'Original email not found' });
    }

    if (originalEmail.status === 'sent') {
      return res.status(400).json({ success: false, error: 'Reply has already been sent for this email.' });
    }

    const isDemo = isDemoRequest(req);
    const isRealGmail =
      !isDemo &&
      targetEmailId.startsWith('gmail_') &&
      !targetEmailId.startsWith('gmail_msg_');
    let gmailResult: { gmailMessageId: string; threadId: string; verifiedSent?: boolean; verifiedInThread?: boolean } | undefined;

    // 2. REAL GMAIL: Send via Gmail API FIRST before any local state mutations
    if (isRealGmail) {
      if (!gmailService.isAuthenticated()) {
        return res.status(400).json({
          success: false,
          error: 'Gmail is not connected. Please connect your Gmail account in Settings before sending.'
        });
      }

      const rawGmailMsgId = targetEmailId.replace(/^gmail_/, '');
      const replySubject = (subject || originalEmail.subject || 'Re: Message').startsWith('Re:')
        ? (subject || originalEmail.subject)
        : `Re: ${subject || originalEmail.subject}`;

      try {
        gmailResult = await gmailService.sendReply({
          to: originalEmail.sender,
          subject: replySubject,
          bodyText: content || '',
          gmailMessageId: rawGmailMsgId
        });
        console.log(`[API] Gmail send verified. Thread: ${gmailResult.threadId}, Msg: ${gmailResult.gmailMessageId}`);
      } catch (gmailErr: any) {
        console.error('[API] Gmail reply send failed:', gmailErr.message);
        // CRITICAL: Keep draft intact, do NOT create fake local sent record, return real error
        return res.status(500).json({
          success: false,
          error: `Could not send reply via Gmail: ${gmailErr.message}`,
          gmailError: gmailErr.message
        });
      }
    }

    // 3. ONLY AFTER Gmail confirms (or for Demo sandbox), create local sent record & mark draft sent
    const result = await store.sendDraft(targetEmailId, content, subject);
    if (!result.success) {
      return res.status(400).json(result);
    }

    // If real Gmail, also record the real Gmail sent item with actual Gmail ID
    if (isRealGmail && gmailResult) {
      try {
        await store.recordRealGmailSent({
          id: `gmail_sent_${gmailResult.gmailMessageId}`,
          original_email_id: targetEmailId,
          recipient: originalEmail.sender,
          subject: result.sentEmail?.subject || originalEmail.subject,
          body: content || result.sentEmail?.body || '',
          sent_at: new Date().toISOString(),
          status: 'Sent'
        });
      } catch (recordErr: any) {
        console.warn('[API] Could not record real Gmail sent item:', recordErr.message);
      }
    }

    res.json({
      success: true,
      message: isRealGmail
        ? 'Reply sent via Gmail — verified in your Gmail Sent folder and original thread.'
        : 'Reply sent successfully',
      sentEmail: result.sentEmail,
      gmailSent: isRealGmail,
      gmailMessageId: gmailResult?.gmailMessageId || null,
      gmailThreadId: gmailResult?.threadId || null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. GET /api/drafts (Enriched with original email subject, sender, and priority)
router.get('/drafts', async (req: Request, res: Response) => {
  try {
    const isDemo = isDemoRequest(req);
    const source = (req.query.source as string) || (isDemo ? 'demo' : undefined);
    const drafts = await store.getDrafts({ source, isDemo });
    const enrichedDrafts = await Promise.all(
      drafts.map(async (d) => {
        try {
          const email = await store.getEmailById(d.email_id);
          return {
            ...d,
            email_subject: email?.subject || 'No Subject',
            email_sender: email?.sender || '',
            email_sender_name: email?.sender_name || 'Sender',
            email_priority: email?.priority || 'Normal',
            email_topic: email?.topic || 'Work'
          };
        } catch {
          return d;
        }
      })
    );
    res.json({ success: true, drafts: enrichedDrafts });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10. GET /api/sent
router.get('/sent', async (req: Request, res: Response) => {
  try {
    const isDemo = isDemoRequest(req);
    const source = (req.query.source as string) || (isDemo ? 'demo' : undefined);
    const sent = await store.getSentEmails({ source, isDemo });
    res.json({ success: true, sent });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 11. GET /api/style & GET /api/style/profile
const handleGetStyle = async (req: Request, res: Response) => {
  try {
    const profile = await store.getStyleProfile();
    const examples = await store.getStyleExamples();
    res.json({
      success: true,
      profile,
      examples,
      comparison: {
        pastEmail: {
          recipient: 'rahul.verma@techflow.io',
          subject: 'Re: Sprint Retrospective Action Items',
          body: `Hi Rahul,\n\nThanks for compiling the retro action items. I have reviewed the database index migration proposal and approved the ticket.\n\nLet us review the staging metrics together tomorrow morning.\n\nRegards,\nSai`
        },
        aiGeneratedReply: {
          recipient: 'p.kumar@university.edu',
          subject: 'Re: CRITICAL: Final Project Submission & Demo Schedule Moved to Friday',
          body: `Hi Prof. Kumar,\n\nThanks for the update. We have completed the primary triage workflows and will finalize end-to-end integration testing by Thursday evening.\n\nWe are on track to submit the final demo package before Friday 5:00 PM EST.\n\nRegards,\nSai`
        }
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

router.get('/style', handleGetStyle);
router.get('/style/profile', handleGetStyle);

// 12. POST /api/style/learn
router.post('/style/learn', async (req: Request, res: Response) => {
  try {
    const isDemo = isDemoRequest(req);
    const source = (req.query.source as string) || (isDemo ? 'demo' : undefined);
    const sentEmails = await store.getSentEmails({ source, isDemo });
    const profile = await aiService.analyzeWritingStyle(sentEmails);
    const updated = await store.updateStyleProfile(profile);
    res.json({ success: true, profile: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 13. GET /api/stats (Compatible summary stats)
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const isDemo = isDemoRequest(req);
    const source = (req.query.source as string) || (isDemo ? 'demo' : undefined);
    const stats = await store.getStats({ source, isDemo });
    res.json({ success: true, stats });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 13b. GET /api/analytics (Comprehensive data-driven productivity & distribution metrics)
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const isDemo = isDemoRequest(req);
    const source = (req.query.source as string) || (isDemo ? 'demo' : undefined);
    const analytics = await store.getDetailedAnalytics({ source, isDemo });
    res.json({
      success: true,
      analytics,
      stats: analytics
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 14. GMAIL READ-ONLY DEMO SANDBOX INTEGRATION
const GMAIL_DEMO_RECORDS = [
  {
    sender: 'alerts-noreply@google.com',
    senderName: 'Google Cloud Platform',
    recipient: 'alex.morgan@gmail.com',
    subject: '[URGENT] High memory utilization alert on production cluster',
    normalizedSubject: 'High memory utilization alert on production cluster',
    body: 'Google Cloud Monitoring has detected memory usage exceeding 91% on cluster-prod-us-east1. Immediate investigation is required to prevent node eviction. Please review the attached monitoring dashboard.',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    isSent: false
  },
  {
    sender: 'sarah.kim@designstudio.io',
    senderName: 'Sarah Kim',
    recipient: 'alex.morgan@gmail.com',
    subject: 'Feedback on MailPilot Mobile UI v2',
    normalizedSubject: 'Feedback on MailPilot Mobile UI v2',
    body: 'Hey Alex, I reviewed the latest Figma prototypes for the mobile triage screen. The swipe-to-triage gestures look great. Can we schedule 15 minutes tomorrow afternoon to finalize the color tokens?',
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    isSent: false
  },
  {
    sender: 'billing@acme-infra.net',
    senderName: 'Acme Infrastructure',
    recipient: 'alex.morgan@gmail.com',
    subject: 'Annual Renewal Notice: API Gateway Subscription',
    normalizedSubject: 'Annual Renewal Notice: API Gateway Subscription',
    body: 'Your annual enterprise API Gateway contract expires on October 31st. We have prepared the renewal quote with standard volume pricing discounts. Please confirm whether you would like to proceed with the 1-year extension.',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    isSent: false
  },
  {
    sender: 'david.chen@teampilot.dev',
    senderName: 'David Chen',
    recipient: 'alex.morgan@gmail.com',
    subject: 'Agenda for Thursday Engineering Sync',
    normalizedSubject: 'Agenda for Thursday Engineering Sync',
    body: 'Hi team,\nHere is the proposed agenda for our Thursday sync:\n1. Groq rate-limiting cascade benchmarks.\n2. Supabase PostgreSQL indexing.\n3. Phase 6 QA checklist.\nPlease add any additional talking points before noon.',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    isSent: false
  }
];

// GET /api/gmail/status
router.get('/gmail/status', (req: Request, res: Response) => {
  const isDemo = isDemoRequest(req);
  if (isDemo) {
    return res.json({
      success: true,
      connected: false,
      mode: 'demo',
      accountEmail: 'sai@mailpilot.demo',
      scopes: [],
      lastSync: null,
      messagesImported: 0,
      configured: gmailService.isConfigured(),
      isOAuthConfigured: gmailService.isConfigured(),
      missingEnv: [],
      note: 'Operating in isolated demo session mode.',
      authUrl: undefined
    });
  }
  const status = gmailService.getStatus();
  res.json({ success: true, ...status });
});

// GET /api/gmail/oauth/start
router.get('/gmail/oauth/start', (req: Request, res: Response) => {
  try {
    if (!gmailService.isConfigured()) {
      if (req.headers.accept?.includes('application/json')) {
        return res.status(400).json({
          success: false,
          error: 'Google OAuth credentials not configured on server (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET required).'
        });
      }
      return res.redirect('http://localhost:5173/settings?gmail_error=oauth_not_configured');
    }

    const authUrl = gmailService.generateAuthUrl();
    if (req.headers.accept?.includes('application/json') && !req.query.redirect) {
      return res.json({ success: true, authUrl });
    }
    return res.redirect(authUrl);
  } catch (err: any) {
    if (req.headers.accept?.includes('application/json')) {
      return res.status(500).json({ success: false, error: err.message });
    }
    return res.redirect(`http://localhost:5173/settings?gmail_error=${encodeURIComponent(err.message)}`);
  }
});

// GET /api/gmail/oauth/callback
router.get('/gmail/oauth/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string | undefined;
  const error = req.query.error as string | undefined;

  if (error) {
    if (req.headers.accept?.includes('application/json')) {
      return res.status(400).json({ success: false, error });
    }
    return res.redirect(`http://localhost:5173/settings?gmail_error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    if (req.headers.accept?.includes('application/json')) {
      return res.status(400).json({ success: false, error: 'Missing authorization code' });
    }
    return res.status(400).redirect(`http://localhost:5173/settings?gmail_error=missing_auth_code`);
  }

  try {
    const result = await gmailService.exchangeCodeForTokens(code);
    if (req.headers.accept?.includes('application/json')) {
      return res.json({ success: true, email: result.email });
    }
    return res.redirect(`http://localhost:5173/settings?gmail_success=true`);
  } catch (err: any) {
    if (req.headers.accept?.includes('application/json')) {
      return res.status(400).json({ success: false, error: err.message });
    }
    return res.status(400).redirect(`http://localhost:5173/settings?gmail_error=${encodeURIComponent(err.message)}`);
  }
});

// POST /api/gmail/connect (Demo Sandbox connection)
router.post('/gmail/connect', (req: Request, res: Response) => {
  const accountEmail = req.body?.accountEmail || 'alex.morgan@gmail.com';
  const status = gmailService.connectDemo(accountEmail);
  res.json({
    success: true,
    message: `Connected to Gmail Demo sandbox as ${status.accountEmail} (read-only)`,
    ...status
  });
});

// POST /api/gmail/disconnect
router.post('/gmail/disconnect', async (req: Request, res: Response) => {
  try {
    const status = await gmailService.disconnect();
    res.json({
      success: true,
      message: 'Disconnected from Gmail',
      ...status
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/gmail/sync (Syncs real inbox if authenticated, otherwise demo sandbox)
router.post('/gmail/sync', async (req: Request, res: Response) => {
  try {
    const isDemo = isDemoRequest(req);
    if (isDemo) {
      console.log('[GMAIL SYNC]\nDemo session detected — Gmail synchronization skipped.');
      return res.json({
        success: true,
        message: 'Demo session active — Gmail synchronization skipped.',
        skipped: true,
        stats: {
          imported: 0,
          updated: 0,
          sentImported: 0,
          threads: 0,
          duplicates: 0
        }
      });
    }

    console.log('[GMAIL SYNC]\nReal Gmail session — synchronization allowed.');
    const currentStatus = gmailService.getStatus();

    // If connected via real OAuth, fetch real Gmail messages (two-way sync)
    if (currentStatus.mode === 'real' && currentStatus.connected) {
      const realStats = await gmailService.syncRealGmail(25);
      const updatedStatus = gmailService.getStatus();

      if (realStats.inProgress) {
        return res.json({
          success: true,
          message: 'Gmail synchronization is already in progress.',
          inProgress: true,
          stats: { imported: 0, updated: 0, sentImported: 0, threads: 0, duplicates: 0 },
          gmailStatus: updatedStatus
        });
      }

      if (realStats.cooldown) {
        return res.json({
          success: true,
          message: `Gmail API rate-limit/quota cooldown active (${realStats.cooldownSeconds || 60}s remaining).`,
          cooldown: true,
          cooldownSeconds: realStats.cooldownSeconds,
          stats: { imported: 0, updated: 0, sentImported: 0, threads: 0, duplicates: 0 },
          gmailStatus: updatedStatus
        });
      }

      let message = `Synced ${realStats.imported} new Gmail messages.`;
      if (realStats.imported > 0 || (realStats.sentImported && realStats.sentImported > 0)) {
        message = `Synced ${realStats.imported} new inbox and ${realStats.sentImported || 0} sent messages.`;
      } else if (realStats.updated && realStats.updated > 0) {
        message = `Gmail inbox updated — refreshed read state for ${realStats.updated} messages.`;
      } else if (realStats.duplicates > 0) {
        message = `Gmail inbox is already up to date — ${realStats.duplicates} messages verified, 0 new.`;
      } else {
        message = `Gmail inbox is already up to date — 0 new messages found.`;
      }

      return res.json({
        success: true,
        message,
        stats: {
          imported: realStats.imported,
          updated: realStats.updated,
          sentImported: realStats.sentImported,
          threads: realStats.threads,
          duplicates: realStats.duplicates,
          inbox: realStats.imported,
          sent: realStats.sentImported,
          skipped: 0,
          errors: 0
        },
        gmailStatus: updatedStatus
      });
    }

    return res.json({
      success: true,
      message: 'Gmail is not connected in real mode.',
      stats: { imported: 0, updated: 0, sentImported: 0, threads: 0, duplicates: 0 },
      gmailStatus: currentStatus
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to sync Gmail messages: ' + err.message });
  }
});

// 15. GET /api/settings (Unified status for settings dashboard)
router.get('/settings', async (req: Request, res: Response) => {
  try {
    const dbMode = await store.getActiveDatabaseMode();
    const aiStatus = aiService.getAIStatus();
    const gmailStatus = store.getGmailStatus();
    const styleProfile = await store.getStyleProfile();

    res.json({
      success: true,
      database: {
        mode: dbMode,
        provider: 'Supabase PostgreSQL',
        connected: dbMode === 'supabase'
      },
      ai: {
        provider: aiStatus.provider,
        model: aiStatus.model,
        primaryModel: aiStatus.primaryModel,
        fallbackModel: aiStatus.fallbackModel,
        configured: aiStatus.configured
      },
      gmail: gmailStatus,
      style: {
        tone: styleProfile.tone,
        formality: styleProfile.formality,
        sentence_length: styleProfile.sentence_length,
        greeting: styleProfile.greeting,
        signoff: styleProfile.signoff,
        learned_from_count: styleProfile.learned_from_count
      },
      toneScale: [
        { level: 1, label: 'More casual', example: 'Hey {name}, ... Best, Sai' },
        { level: 2, label: 'Slightly casual', example: 'Hi {name}, ... Thanks, Sai' },
        { level: 3, label: 'Balanced', example: 'Hi {name}, ... Regards, Sai' },
        { level: 4, label: 'More formal', example: 'Dear {name}, ... Best regards, Sai' },
        { level: 5, label: 'Highly formal', example: 'Dear {name}, ... Sincerely, Sai' }
      ]
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 16. POST /api/ai/test (Safe dev/test route to verify Groq AI classification)
router.post('/ai/test', async (req: Request, res: Response) => {
  try {
    const subject = req.body?.subject || 'Project meeting tomorrow';
    const body = req.body?.body || 'Can we confirm the meeting time for tomorrow?';

    const result = await aiService.testGroqConnection(subject, body);
    res.json({
      success: true,
      provider: result.provider,
      model: result.model,
      classification: result.classification
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

