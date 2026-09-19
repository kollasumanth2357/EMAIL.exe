import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import { importService, ParsedEmailRecord } from './import.service.js';
import { GmailStatus } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TOKEN_FILE_PATH = path.resolve(__dirname, '../../.gmail_tokens.json');

// Minimum scopes: modify (read + mark as read) + send (reply in thread)
export const GMAIL_MODIFY_SCOPE = 'https://www.googleapis.com/auth/gmail.modify';
export const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';
export const GMAIL_SCOPES = [GMAIL_MODIFY_SCOPE, GMAIL_SEND_SCOPE];

// Keep old constant as an alias so other files that import it don't break
export const GMAIL_READONLY_SCOPE = GMAIL_MODIFY_SCOPE;
export const DEFAULT_REDIRECT_URI = 'http://localhost:5000/api/gmail/oauth/callback';

export interface GmailSendReplyOptions {
  to: string;             // original sender's email address
  subject: string;        // reply subject (Re: …)
  bodyText: string;       // plain-text body of the reply
  gmailMessageId: string; // raw Gmail message ID or prefixed ID
}

export interface GmailSendResult {
  gmailMessageId: string;
  threadId: string;
  verifiedSent: boolean;
  verifiedInThread: boolean;
}

export interface GmailMarkReadResult {
  success: boolean;
  verifiedRead: boolean;
  gmailMessageId: string;
  threadId?: string;
  beforeLabels: string[];
  afterLabels: string[];
}

export class GmailService {
  private oauth2Client: OAuth2Client | null = null;
  private tokens: any = null;
  private authenticatedEmail: string = '';
  private realLastSync: string | null = null;
  private realMessagesImported: number = 0;

  // In-flight synchronization lock to prevent concurrent sync operations
  private isSyncInProgress: boolean = false;

  // Quota and Rate-limiting protection
  private quotaCooldownUntil: number = 0;
  private rateLimitCount: number = 0;

  // In-memory demo sandbox state for fallback
  private demoState = {
    connected: false,
    accountEmail: 'alex.morgan@gmail.com',
    lastSync: null as string | null,
    messagesImported: 0
  };

  constructor() {
    this.loadSavedTokens();
  }

  // ─── Token Persistence ──────────────────────────────────────────────────────

  private loadSavedTokens(): void {
    try {
      if (fs.existsSync(TOKEN_FILE_PATH)) {
        const raw = fs.readFileSync(TOKEN_FILE_PATH, 'utf-8');
        const data = JSON.parse(raw);
        if (data && data.tokens) {
          this.tokens = data.tokens;
          this.authenticatedEmail = data.authenticatedEmail || '';
          if (this.oauth2Client) {
            this.oauth2Client.setCredentials(this.tokens);
          }
          console.log(`[Gmail] Restored active session for ${this.authenticatedEmail}`);
        }
      }
    } catch (err: any) {
      console.warn('[Gmail] Could not load persisted tokens:', err.message);
    }
  }

  private persistTokens(): void {
    try {
      if (this.tokens) {
        fs.writeFileSync(
          TOKEN_FILE_PATH,
          JSON.stringify(
            {
              tokens: this.tokens,
              authenticatedEmail: this.authenticatedEmail,
              savedAt: new Date().toISOString()
            },
            null,
            2
          ),
          'utf-8'
        );
      }
    } catch (err: any) {
      console.warn('[Gmail] Could not persist tokens to disk:', err.message);
    }
  }

  private clearPersistedTokens(): void {
    try {
      if (fs.existsSync(TOKEN_FILE_PATH)) {
        fs.unlinkSync(TOKEN_FILE_PATH);
      }
    } catch (err: any) {
      console.warn('[Gmail] Could not delete persisted token file:', err.message);
    }
  }

  // ─── Scopes & Configuration ────────────────────────────────────────────────

  public getGrantedScopes(): string[] {
    if (!this.tokens?.scope) return [];
    if (Array.isArray(this.tokens.scope)) return this.tokens.scope;
    return String(this.tokens.scope).split(' ').filter(Boolean);
  }

  public hasModifyScope(): boolean {
    const scopes = this.getGrantedScopes();
    if (scopes.length === 0) return true; // fallback if scope string absent
    return scopes.includes(GMAIL_MODIFY_SCOPE) || scopes.includes('https://mail.google.com/');
  }

  public hasSendScope(): boolean {
    const scopes = this.getGrantedScopes();
    if (scopes.length === 0) return true;
    return (
      scopes.includes(GMAIL_SEND_SCOPE) ||
      scopes.includes(GMAIL_MODIFY_SCOPE) ||
      scopes.includes('https://mail.google.com/')
    );
  }

  public isConfigured(): boolean {
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
    return Boolean(clientId && clientSecret);
  }

  public getMissingEnv(): string[] {
    const missing: string[] = [];
    if (!process.env.GOOGLE_CLIENT_ID?.trim()) missing.push('GOOGLE_CLIENT_ID');
    if (!process.env.GOOGLE_CLIENT_SECRET?.trim()) missing.push('GOOGLE_CLIENT_SECRET');
    return missing;
  }

  public getRedirectUri(): string {
    return process.env.GOOGLE_REDIRECT_URI?.trim() || DEFAULT_REDIRECT_URI;
  }

  /**
   * Returns true when real OAuth tokens are present (not demo mode)
   */
  public isAuthenticated(): boolean {
    return Boolean(this.tokens && this.authenticatedEmail);
  }

  // ─── OAuth Client ─────────────────────────────────────────────────────────

  public getOAuthClient(): OAuth2Client {
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim() || '';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() || '';
    const redirectUri = this.getRedirectUri();

    if (!this.oauth2Client || (this.oauth2Client as any)._clientId !== clientId) {
      this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
      if (this.tokens) {
        this.oauth2Client.setCredentials(this.tokens);
      }
    }
    return this.oauth2Client;
  }

  /**
   * Generate Google OAuth 2.0 Authorization URL with gmail.modify + gmail.send scopes
   */
  public generateAuthUrl(): string {
    if (!this.isConfigured()) {
      throw new Error('Google OAuth credentials not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.');
    }
    const client = this.getOAuthClient();
    return client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: GMAIL_SCOPES
    });
  }

  public generateAuthUrlSafe(): string | undefined {
    try {
      if (this.isConfigured()) {
        return this.generateAuthUrl();
      }
    } catch {
      // Ignored
    }
    return undefined;
  }

  // ─── Token Exchange ────────────────────────────────────────────────────────

  public async exchangeCodeForTokens(code: string): Promise<{ success: boolean; email: string }> {
    if (!code || typeof code !== 'string') {
      throw new Error('Invalid or missing authorization code');
    }
    if (!this.isConfigured()) {
      throw new Error('Google OAuth credentials not configured on server');
    }

    const client = this.getOAuthClient();
    const { tokens } = await client.getToken(code);
    this.tokens = tokens;
    client.setCredentials(tokens);

    let userEmail = 'connected-user@gmail.com';
    try {
      const gmail = google.gmail({ version: 'v1', auth: client });
      const profile = await gmail.users.getProfile({ userId: 'me' });
      if (profile.data.emailAddress) {
        userEmail = profile.data.emailAddress;
      }
    } catch (err: any) {
      console.warn('[Gmail] Could not fetch Gmail user profile after token exchange:', err.message);
    }

    this.authenticatedEmail = userEmail;
    this.persistTokens();
    return { success: true, email: userEmail };
  }

  // ─── Status ────────────────────────────────────────────────────────────────

  public getStatus(): GmailStatus {
    const isConfig = this.isConfigured();
    const isRealConnected = this.isAuthenticated();
    const grantedScopes = this.getGrantedScopes();

    if (isRealConnected) {
      return {
        connected: true,
        mode: 'real',
        accountEmail: this.authenticatedEmail,
        scopes: grantedScopes.length > 0 ? grantedScopes : GMAIL_SCOPES,
        lastSync: this.realLastSync,
        messagesImported: this.realMessagesImported,
        configured: isConfig,
        isOAuthConfigured: isConfig,
        missingEnv: [],
        note: `Connected via OAuth 2.0 (${this.authenticatedEmail}) — read, mark as read, and reply sync are active.`,
        authUrl: this.generateAuthUrlSafe()
      };
    }

    if (this.demoState.connected) {
      return {
        connected: true,
        mode: 'demo',
        accountEmail: this.demoState.accountEmail,
        scopes: GMAIL_SCOPES,
        lastSync: this.demoState.lastSync,
        messagesImported: this.demoState.messagesImported,
        configured: isConfig,
        isOAuthConfigured: isConfig,
        missingEnv: this.getMissingEnv(),
        note: 'Operating in safe sandbox demo mode.',
        authUrl: this.generateAuthUrlSafe()
      };
    }

    return {
      connected: false,
      mode: isConfig ? 'real' : 'demo',
      accountEmail: '',
      scopes: GMAIL_SCOPES,
      lastSync: null,
      messagesImported: 0,
      configured: isConfig,
      isOAuthConfigured: isConfig,
      missingEnv: this.getMissingEnv(),
      note: isConfig
        ? 'Google OAuth credentials configured. Ready to connect real Gmail account.'
        : 'Operating in safe sandbox demo mode. No real Gmail emails will be modified or sent.',
      authUrl: this.generateAuthUrlSafe()
    };
  }

  // ─── Disconnect ────────────────────────────────────────────────────────────

  public async disconnect(): Promise<GmailStatus> {
    if (this.tokens && this.oauth2Client) {
      try {
        if (this.tokens.access_token) {
          await this.oauth2Client.revokeToken(this.tokens.access_token).catch(() => {});
        }
      } catch {
        // Ignore revocation errors
      }
    }
    this.tokens = null;
    this.authenticatedEmail = '';
    this.realLastSync = null;

    this.isSyncInProgress = false;
    this.quotaCooldownUntil = 0;
    this.rateLimitCount = 0;

    this.demoState.connected = false;
    this.demoState.lastSync = null;

    this.clearPersistedTokens();

    return this.getStatus();
  }

  // ─── Quota & Rate Limit Backoff ──────────────────────────────────────────

  private handleQuotaError(err: any): void {
    const status = err?.status || err?.response?.status || err?.code;
    const message = (err?.message || '').toLowerCase();
    const isRateLimit =
      status === 429 ||
      status === 403 ||
      message.includes('rate') ||
      message.includes('quota') ||
      message.includes('userratelimitexceeded') ||
      message.includes('ratelimitexceeded');

    if (isRateLimit) {
      this.rateLimitCount = Math.min(this.rateLimitCount + 1, 5);
      // Exponential backoff: 60s, 120s, 240s, 480s, 960s
      const backoffSeconds = 60 * Math.pow(2, this.rateLimitCount - 1);
      this.quotaCooldownUntil = Date.now() + backoffSeconds * 1000;
      console.warn(
        `[Gmail API] Quota/Rate-limit encountered (level ${this.rateLimitCount}). Applied exponential backoff: ${backoffSeconds}s cooldown.`
      );
    }
  }

  public getQuotaCooldownSeconds(): number {
    if (Date.now() >= this.quotaCooldownUntil) return 0;
    return Math.ceil((this.quotaCooldownUntil - Date.now()) / 1000);
  }

  // ─── Demo Sandbox ──────────────────────────────────────────────────────────

  public connectDemo(email: string = 'alex.morgan@gmail.com'): GmailStatus {
    this.tokens = null;
    this.authenticatedEmail = '';
    this.demoState.connected = true;
    this.demoState.accountEmail = email;
    return this.getStatus();
  }

  public recordDemoSync(count: number): GmailStatus {
    this.demoState.lastSync = new Date().toISOString();
    this.demoState.messagesImported += count;
    return this.getStatus();
  }

  // ─── Read-State Sync: MailPilot → Gmail ─────────────────────────────────────

  /**
   * Mark a Gmail message as read in the real Gmail account.
   * 1. Inspects metadata before labels.
   * 2. Calls messages.modify({ removeLabelIds: ['UNREAD'] }).
   * 3. Re-inspects message to verify 'UNREAD' is no longer present.
   * Returns verification details or throws an informative error.
   */
  public async markMessageAsRead(rawGmailMessageId: string): Promise<GmailMarkReadResult> {
    const gmailMessageId = rawGmailMessageId.replace(/^gmail_/, '');

    if (!this.isAuthenticated()) {
      throw new Error('Gmail is not authenticated. Please connect via Settings.');
    }

    const grantedScopes = this.getGrantedScopes();
    if (grantedScopes.length > 0 && !this.hasModifyScope()) {
      console.error(`[GMAIL READ] Lacking modify scope. Granted: ${grantedScopes.join(', ')}`);
      throw new Error(
        `Active Gmail OAuth authorization does not have the 'gmail.modify' scope. Granted: ${grantedScopes.join(', ')}. Please reconnect Gmail in Settings.`
      );
    }

    const client = this.getOAuthClient();
    const gmail = google.gmail({ version: 'v1', auth: client });

    // 1. Verify message exists and check labels
    let msg;
    try {
      msg = await gmail.users.messages.get({
        userId: 'me',
        id: gmailMessageId,
        format: 'metadata'
      });
    } catch (getErr: any) {
      console.error(`[GMAIL READ] messages.get() failed for ${gmailMessageId}:`, getErr.message);
      throw new Error(`Could not fetch message ${gmailMessageId} from Gmail: ${getErr.message}`);
    }

    const beforeLabels = msg.data.labelIds || [];
    const threadId = msg.data.threadId || undefined;

    console.log(
      `[GMAIL READ]\n` +
      `MailPilot ID: gmail_${gmailMessageId}\n` +
      `Gmail Message ID: ${gmailMessageId}\n` +
      `Gmail Thread ID: ${threadId || 'unknown'}\n` +
      `Before Labels: ${JSON.stringify(beforeLabels)}`
    );

    let afterLabels = [...beforeLabels];
    let modifyStatus = 'Skipped (already marked read)';

    if (beforeLabels.includes('UNREAD')) {
      // 2. Remove UNREAD label
      try {
        const modifyRes = await gmail.users.messages.modify({
          userId: 'me',
          id: gmailMessageId,
          requestBody: {
            removeLabelIds: ['UNREAD']
          }
        });
        modifyStatus = `HTTP ${modifyRes.status || 200}`;
      } catch (modErr: any) {
        console.error(`[GMAIL READ] messages.modify() failed for ${gmailMessageId}:`, modErr.message);
        throw new Error(`Gmail API error modifying labels on message ${gmailMessageId}: ${modErr.message}`);
      }

      // 3. Immediately re-fetch and verify that UNREAD is removed
      try {
        const verifyMsg = await gmail.users.messages.get({
          userId: 'me',
          id: gmailMessageId,
          format: 'metadata'
        });
        afterLabels = verifyMsg.data.labelIds || [];
      } catch (verifyErr: any) {
        console.error(`[GMAIL READ] Post-modify verification get() failed for ${gmailMessageId}:`, verifyErr.message);
        throw new Error(`Could not verify read state update for message ${gmailMessageId}: ${verifyErr.message}`);
      }
    }

    const verifiedRead = !afterLabels.includes('UNREAD');

    console.log(
      `[GMAIL READ]\n` +
      `modify response: ${modifyStatus}\n` +
      `After Labels: ${JSON.stringify(afterLabels)}\n` +
      `Verified Read: ${verifiedRead}`
    );

    if (!verifiedRead) {
      throw new Error(`Gmail API did not remove UNREAD label from message ${gmailMessageId}.`);
    }

    return {
      success: true,
      verifiedRead: true,
      gmailMessageId,
      threadId,
      beforeLabels,
      afterLabels
    };
  }

  // ─── Send Reply: MailPilot → Original Gmail Thread ─────────────────────────

  /**
   * Send a reply to an original Gmail message via the Gmail API.
   * 1. Fetches the ORIGINAL message to get threadId, Message-ID, and References.
   * 2. Builds standard RFC 2822 MIME message with proper In-Reply-To and References.
   * 3. Sends via gmail.users.messages.send with the original threadId.
   * 4. Verifies the sent message exists in Gmail and resides in the original thread.
   */
  public async sendReply(options: GmailSendReplyOptions): Promise<GmailSendResult> {
    const rawGmailId = options.gmailMessageId.replace(/^gmail_/, '');

    if (!this.isAuthenticated()) {
      throw new Error('Gmail is not authenticated. Please connect via Settings.');
    }

    const grantedScopes = this.getGrantedScopes();
    if (grantedScopes.length > 0 && !this.hasSendScope()) {
      console.error(`[GMAIL SEND] Lacking send scope. Granted: ${grantedScopes.join(', ')}`);
      throw new Error(
        `Active Gmail OAuth authorization does not have the 'gmail.send' or 'gmail.modify' scope. Granted: ${grantedScopes.join(', ')}. Please reconnect Gmail in Settings.`
      );
    }

    const client = this.getOAuthClient();
    const gmail = google.gmail({ version: 'v1', auth: client });

    // Step 1: Fetch the original message with format: 'full'
    let original;
    try {
      original = await gmail.users.messages.get({
        userId: 'me',
        id: rawGmailId,
        format: 'full'
      });
    } catch (err: any) {
      console.error(`[GMAIL SEND] Could not fetch original message ${rawGmailId}:`, err.message);
      throw new Error(`Could not fetch original Gmail message ${rawGmailId} for threading: ${err.message}`);
    }

    const actualGmailThreadId = original.data.threadId;
    if (!actualGmailThreadId) {
      throw new Error(`Could not determine Gmail threadId for original message ${rawGmailId}.`);
    }

    const headers = original.data.payload?.headers || [];
    const getHeader = (name: string) =>
      headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

    const originalRFCMessageId = getHeader('Message-ID');
    const originalReferences = getHeader('References');
    const originalSubject = getHeader('Subject') || 'No Subject';
    const originalFrom = getHeader('From') || '';

    // Determine recipient
    const recipient = options.to || this.parseSender(originalFrom).sender;

    // Determine Subject: Ensure single "Re: " prefix
    let formattedSubject = options.subject || originalSubject;
    if (!/^re:\s*/i.test(formattedSubject)) {
      formattedSubject = `Re: ${formattedSubject}`;
    }

    // Step 2: Build RFC 2822 MIME message
    const fromAddress = this.authenticatedEmail;
    const mimeLines: string[] = [
      `From: ${fromAddress}`,
      `To: ${recipient}`,
      `Subject: ${formattedSubject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: 8bit'
    ];

    if (originalRFCMessageId) {
      mimeLines.push(`In-Reply-To: ${originalRFCMessageId}`);
      if (originalReferences) {
        mimeLines.push(`References: ${originalReferences} ${originalRFCMessageId}`);
      } else {
        mimeLines.push(`References: ${originalRFCMessageId}`);
      }
    }

    mimeLines.push(''); // blank line separating headers from body
    mimeLines.push(options.bodyText);

    const rawMime = mimeLines.join('\r\n');

    // Step 3: Base64url-encode
    const encodedMessage = Buffer.from(rawMime)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Step 4: Send via Gmail API with explicit threadId
    let sendRes;
    try {
      sendRes = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
          threadId: actualGmailThreadId
        }
      });
    } catch (sendErr: any) {
      console.error(`[GMAIL SEND] Gmail API messages.send() failed:`, sendErr.message);
      throw new Error(`Gmail API failed to send reply: ${sendErr.message}`);
    }

    const returnedMessageId = sendRes.data.id;
    const returnedThreadId = sendRes.data.threadId;

    if (!returnedMessageId) {
      throw new Error('Gmail API send did not return a valid message ID.');
    }

    // Step 5: Verify Sent Message exists
    let verifiedSent = false;
    try {
      const sentVerification = await gmail.users.messages.get({
        userId: 'me',
        id: returnedMessageId,
        format: 'metadata'
      });
      verifiedSent = Boolean(sentVerification.data.id === returnedMessageId);
    } catch (sentVerifyErr: any) {
      console.warn(`[GMAIL SEND] Warning: Could not verify sent message via messages.get():`, sentVerifyErr.message);
    }

    // Step 6: Verify Original Gmail Thread contains the new message
    let verifiedInThread = false;
    try {
      const threadVerification = await gmail.users.threads.get({
        userId: 'me',
        id: actualGmailThreadId,
        format: 'metadata'
      });
      const threadMsgs = threadVerification.data.messages || [];
      verifiedInThread = threadMsgs.some((m) => m.id === returnedMessageId);
    } catch (threadVerifyErr: any) {
      console.warn(`[GMAIL SEND] Warning: Could not verify thread containment:`, threadVerifyErr.message);
    }

    console.log(
      `[GMAIL SEND]\n` +
      `Original MailPilot ID: gmail_${rawGmailId}\n` +
      `Original Gmail Message ID: ${rawGmailId}\n` +
      `Original Gmail Thread ID: ${actualGmailThreadId}\n` +
      `Original Message-ID: ${originalRFCMessageId || '(none)'}\n` +
      `To: ${recipient}\n` +
      `Subject: ${formattedSubject}\n` +
      `Gmail Send Response: HTTP 200 - id: ${returnedMessageId}, threadId: ${returnedThreadId}\n` +
      `Returned Gmail Message ID: ${returnedMessageId}\n` +
      `Returned Gmail Thread ID: ${returnedThreadId}\n` +
      `Thread Verification: Message ${returnedMessageId} verified in thread ${actualGmailThreadId}: ${verifiedInThread}`
    );

    return {
      gmailMessageId: returnedMessageId,
      threadId: actualGmailThreadId,
      verifiedSent,
      verifiedInThread
    };
  }

  // ─── Two-Way Gmail Synchronization ─────────────────────────────────────────

  /**
   * Complete Two-Way Gmail Synchronization:
   * 1. Fetches real inbox messages and syncs read/unread state for existing emails.
   * 2. Ingests newly arrived inbox emails into MailPilot.
   * 3. Fetches sent emails from Gmail and synchronizes them into MailPilot Sent.
   */
  public async syncRealGmail(maxResults: number = 25): Promise<{
    imported: number;
    updated: number;
    sentImported: number;
    threads: number;
    duplicates: number;
    inProgress?: boolean;
    cooldown?: boolean;
    cooldownSeconds?: number;
    message?: string;
  }> {
    if (!this.tokens) {
      throw new Error('Not authenticated with Gmail. Please authorize via /api/gmail/oauth/start');
    }

    // 1. In-flight Synchronization Lock Guard (Prevent concurrent syncs)
    if (this.isSyncInProgress) {
      console.log('[Gmail Sync] Synchronization already in progress — skipping concurrent execution.');
      return {
        imported: 0,
        updated: 0,
        sentImported: 0,
        threads: 0,
        duplicates: 0,
        inProgress: true,
        message: 'Sync already in progress'
      };
    }

    // 2. Quota & Rate-limiting Cooldown Guard
    if (Date.now() < this.quotaCooldownUntil) {
      const remainingSec = Math.ceil((this.quotaCooldownUntil - Date.now()) / 1000);
      console.warn(`[Gmail Sync] Rate limit / quota cooldown active (${remainingSec}s remaining). Skipping sync.`);
      return {
        imported: 0,
        updated: 0,
        sentImported: 0,
        threads: 0,
        duplicates: 0,
        cooldown: true,
        cooldownSeconds: remainingSec,
        message: `Quota cooldown active for ${remainingSec}s`
      };
    }

    this.isSyncInProgress = true;

    try {
      const client = this.getOAuthClient();
      const gmail = google.gmail({ version: 'v1', auth: client });
      const { store } = await import('./store.service.js');

      let inboxImported = 0;
      let inboxUpdated = 0;
      let sentImported = 0;
      let threadsCount = 0;
      let duplicatesCount = 0;

      // ── 1. Synchronize Inbox (New Messages + Read/Unread State Changes) ─────────
      try {
        const listRes = await gmail.users.messages.list({
          userId: 'me',
          maxResults,
          q: 'in:inbox'
        });

        const messages = listRes.data.messages || [];
        const newRecords: ParsedEmailRecord[] = [];

        // Fetch existing local emails for state comparison
        const existingEmails = await store.getEmails();
        const existingMap = new Map<string, typeof existingEmails[0]>();
        existingEmails.forEach((e) => existingMap.set(e.id, e));

        for (const msgRef of messages) {
          if (!msgRef.id) continue;
          const mailPilotId = `gmail_${msgRef.id}`;

          try {
            // OPTIMIZATION: If message already exists locally, fetch ONLY minimal metadata
            // to check read/unread status with minimal quota consumption.
            if (existingMap.has(mailPilotId)) {
              duplicatesCount++;
              const metaMsg = await gmail.users.messages.get({
                userId: 'me',
                id: msgRef.id,
                format: 'metadata',
                fields: 'id,threadId,labelIds'
              });

              const labelIds = metaMsg.data.labelIds || [];
              const isUnread = labelIds.includes('UNREAD');
              const isRead = !isUnread;

              const existing = existingMap.get(mailPilotId)!;
              if (existing.is_read !== isRead) {
                await store.updateEmail(mailPilotId, { is_read: isRead });
                inboxUpdated++;
              }
              continue;
            }

            // Otherwise, this is a BRAND NEW message: fetch format: 'full' to parse headers and body
            const fullMsg = await gmail.users.messages.get({
              userId: 'me',
              id: msgRef.id,
              format: 'full'
            });

            const labelIds = fullMsg.data.labelIds || [];
            const isUnread = labelIds.includes('UNREAD');
            const isRead = !isUnread;

            const headers = fullMsg.data.payload?.headers || [];
            const getHeader = (name: string) =>
              headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

            const fromHeader = getHeader('From');
            const toHeader = getHeader('To') || this.authenticatedEmail || 'me@gmail.com';
            const subject = getHeader('Subject') || 'No Subject';
            const dateHeader = getHeader('Date');
            const messageId = getHeader('Message-ID') || msgRef.id;

            const { sender, senderName } = this.parseSender(fromHeader);
            const body = this.extractBody(fullMsg.data.payload) || fullMsg.data.snippet || '(No content)';
            const timestamp = dateHeader ? new Date(dateHeader).toISOString() : new Date().toISOString();

            newRecords.push({
              id: mailPilotId,
              sender,
              senderName,
              recipient: toHeader,
              subject,
              normalizedSubject: importService.normalizeSubject(subject),
              body,
              timestamp,
              isSent: false,
              isRead,
              messageId
            });
          } catch (err: any) {
            this.handleQuotaError(err);
            console.warn(`[Gmail Sync] Error processing inbox message ${msgRef.id}:`, err.message);
          }
        }

        if (newRecords.length > 0) {
          const stats = await importService.persistNormalizedRecords(newRecords);
          inboxImported = stats.imported;
          threadsCount = stats.threads;
        }
      } catch (inboxErr: any) {
        this.handleQuotaError(inboxErr);
        console.warn('[Gmail Sync] Error querying Gmail inbox:', inboxErr.message);
      }

      // ── 2. Synchronize Sent Messages (Gmail Sent → MailPilot Sent) ──────────────
      try {
        const sentListRes = await gmail.users.messages.list({
          userId: 'me',
          maxResults: 15,
          q: 'in:sent'
        });

        const sentMessages = sentListRes.data.messages || [];
        const existingSent = await store.getSentEmails();
        const existingSentIds = new Set(existingSent.map((s) => s.id));

        for (const sentRef of sentMessages) {
          if (!sentRef.id) continue;
          const sentRecordId = `gmail_sent_${sentRef.id}`;

          // OPTIMIZATION: If already recorded in local sent archive, skip immediately (0 API calls)
          if (existingSentIds.has(sentRecordId)) {
            continue;
          }

          try {
            const fullSent = await gmail.users.messages.get({
              userId: 'me',
              id: sentRef.id,
              format: 'full'
            });

            const headers = fullSent.data.payload?.headers || [];
            const getHeader = (name: string) =>
              headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

            const toHeader = getHeader('To') || 'recipient@example.com';
            const subject = getHeader('Subject') || 'No Subject';
            const dateHeader = getHeader('Date');
            const body = this.extractBody(fullSent.data.payload) || fullSent.data.snippet || '';
            const timestamp = dateHeader ? new Date(dateHeader).toISOString() : new Date().toISOString();
            const gmailThreadId = fullSent.data.threadId;

            await store.recordRealGmailSent({
              id: sentRecordId,
              original_email_id: gmailThreadId ? `gmail_${gmailThreadId}` : '',
              recipient: toHeader,
              subject,
              body,
              sent_at: timestamp,
              status: 'Sent'
            });

            existingSentIds.add(sentRecordId);
            sentImported++;
          } catch (sentItemErr: any) {
            this.handleQuotaError(sentItemErr);
            console.warn(`[Gmail Sync] Error processing sent message ${sentRef.id}:`, sentItemErr.message);
          }
        }
      } catch (sentErr: any) {
        this.handleQuotaError(sentErr);
        console.warn('[Gmail Sync] Error querying Gmail sent messages:', sentErr.message);
      }

      this.realLastSync = new Date().toISOString();
      this.realMessagesImported += inboxImported;

      // On successful sync, reset rate-limit error count and cooldown
      if (this.rateLimitCount > 0 && Date.now() >= this.quotaCooldownUntil) {
        this.rateLimitCount = 0;
        this.quotaCooldownUntil = 0;
      }

      return {
        imported: inboxImported,
        updated: inboxUpdated,
        sentImported,
        threads: threadsCount,
        duplicates: duplicatesCount
      };
    } finally {
      this.isSyncInProgress = false;
    }
  }

  /**
   * Alias for backwards compatibility with existing routes.
   */
  public async fetchAndSyncRealInbox(maxResults: number = 25): Promise<{
    imported: number;
    threads: number;
    duplicates: number;
    updated?: number;
    sentImported?: number;
  }> {
    return await this.syncRealGmail(maxResults);
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private parseSender(fromHeader: string): { sender: string; senderName: string } {
    if (!fromHeader) return { sender: 'unknown@example.com', senderName: 'Unknown' };
    const match = fromHeader.match(/^(.*?)\s*<(.+?)>$/);
    if (match) {
      const name = match[1].replace(/['"]/g, '').trim();
      return {
        senderName: name || match[2].split('@')[0],
        sender: match[2].trim()
      };
    }
    return {
      sender: fromHeader.trim(),
      senderName: fromHeader.split('@')[0]
    };
  }

  private extractBody(payload: any): string {
    if (!payload) return '';
    if (payload.body && payload.body.data) {
      return Buffer.from(payload.body.data, 'base64url').toString('utf-8');
    }
    if (payload.parts && Array.isArray(payload.parts)) {
      const textPart = payload.parts.find((p: any) => p.mimeType === 'text/plain');
      if (textPart && textPart.body && textPart.body.data) {
        return Buffer.from(textPart.body.data, 'base64url').toString('utf-8');
      }
      const htmlPart = payload.parts.find((p: any) => p.mimeType === 'text/html');
      if (htmlPart && htmlPart.body && htmlPart.body.data) {
        const html = Buffer.from(htmlPart.body.data, 'base64url').toString('utf-8');
        return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      }
      for (const part of payload.parts) {
        const nested = this.extractBody(part);
        if (nested) return nested;
      }
    }
    return '';
  }
}

export const gmailService = new GmailService();
