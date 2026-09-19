import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Email, Thread, Draft, SentEmail, UserStyleProfile, StyleExample, ThreadMessage, Stats, DetailedAnalytics, GmailStatus, UserAccount } from '../types/index.js';
import { demoEmails, demoSentEmails, demoThreads, initialStyleProfile } from '../data/demo_dataset.js';
import { supabase, checkSupabaseHealth } from '../config/supabase.js';
import { gmailService } from './gmail.service.js';
import { hashPassword, verifyPassword } from '../utils/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'mailpilot_db.json');

const DEMO_USER = {
  id: 'user-sai',
  name: 'Sai',
  email: 'sai@mailpilot.demo'
};

interface DatabaseSchema {
  users?: UserAccount[];
  emails: Email[];
  threads: Thread[];
  drafts: Draft[];
  sent_emails: SentEmail[];
  user_style_profile: UserStyleProfile;
  style_examples: StyleExample[];
}

export class StoreService {
  private localData: DatabaseSchema;
  private isSupabaseHealthy: boolean = false;
  private checkedSupabase: boolean = false;
  private gmailDemoState: {
    connected: boolean;
    accountEmail: string;
    lastSync: string | null;
    messagesImported: number;
  } = {
    connected: false,
    accountEmail: 'alex.morgan@gmail.com',
    lastSync: null,
    messagesImported: 0
  };

  constructor() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.localData = JSON.parse(raw);
      } catch (err) {
        this.localData = this.getDefaultLocalData();
        this.persistLocal();
      }
    } else {
      this.localData = this.getDefaultLocalData();
      this.persistLocal();
    }
  }

  /**
   * Evaluates Supabase health and logs status safely without exposing credentials.
   */
  public async getActiveDatabaseMode(): Promise<'supabase' | 'fallback'> {
    const health = await checkSupabaseHealth();
    this.isSupabaseHealthy = health.available;

    if (!this.checkedSupabase) {
      if (this.isSupabaseHealthy) {
        console.log('[Store] Using Supabase PostgreSQL as primary database.');
      } else {
        console.log(`[Store] Supabase unavailable; using local fallback (${health.error || 'Connection check failed'}).`);
      }
      this.checkedSupabase = true;
    }

    return this.isSupabaseHealthy ? 'supabase' : 'fallback';
  }

  private getDefaultLocalData(): DatabaseSchema {
    const styleExamples: StyleExample[] = demoSentEmails.slice(0, 5).map(s => ({
      id: s.id,
      recipient: s.recipient,
      subject: s.subject,
      body: s.body,
      timestamp: s.sent_at
    }));

    const initialDrafts: Draft[] = [
      {
        id: 'draft_01',
        email_id: 'email_01',
        content: `Hi Prof. Kumar,\n\nThanks for the update. We have completed the primary triage workflows and will finalize end-to-end integration testing by Thursday evening.\n\nWe are on track to submit the final demo package before Friday 5:00 PM EST.\n\nRegards,\nSai`,
        tone_match_scores: {
          professional: true,
          concise: true,
          direct: true,
          preferred_greeting: true,
          preferred_signoff: true
        },
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'draft_02',
        email_id: 'email_02',
        content: `Hi Alex,\n\nApproved. Please proceed with throttling retry events and deploy the hotfix branch hotfix/stripe-sig-timeout to production immediately.\n\nKeep me posted on the error rate once the deployment finishes.\n\nRegards,\nSai`,
        tone_match_scores: {
          professional: true,
          concise: true,
          direct: true,
          preferred_greeting: true,
          preferred_signoff: true
        },
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    return {
      emails: JSON.parse(JSON.stringify(demoEmails)),
      threads: JSON.parse(JSON.stringify(demoThreads)),
      drafts: initialDrafts,
      sent_emails: JSON.parse(JSON.stringify(demoSentEmails)),
      user_style_profile: JSON.parse(JSON.stringify(initialStyleProfile)),
      style_examples: styleExamples,
      users: []
    };
  }

  private persistLocal() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.localData, null, 2), 'utf-8');
    } catch (err) {
      console.error('[Store] Failed to write local database file:', err);
    }
  }

  // ==========================================
  // USER ACCOUNTS & AUTHENTICATION
  // ==========================================

  public async findUserByEmail(email: string): Promise<UserAccount | null> {
    if (!email) return null;
    const normalized = email.trim().toLowerCase();
    const mode = await this.getActiveDatabaseMode();

    if (mode === 'supabase' && supabase) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', normalized)
          .maybeSingle();

        if (!error && data) {
          return {
            id: data.id,
            name: data.name || data.email.split('@')[0],
            email: data.email,
            password_hash: data.password_hash || data.password || '',
            created_at: data.created_at || new Date().toISOString()
          };
        }
      } catch (err) {
        console.warn('[Store] Supabase findUserByEmail failed, checking local store:', err);
      }
    }

    const users = this.localData.users || [];
    const found = users.find(u => u.email.toLowerCase() === normalized);
    return found || null;
  }

  public async createUser(
    name: string,
    email: string,
    passwordHash: string
  ): Promise<{ id: string; name: string; email: string; created_at: string }> {
    const normalized = email.trim().toLowerCase();
    const existing = await this.findUserByEmail(normalized);
    if (existing) {
      throw new Error('An account with this email already exists.');
    }

    const id = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const newUser: UserAccount = {
      id,
      name: name.trim(),
      email: normalized,
      password_hash: passwordHash,
      created_at: now
    };

    const mode = await this.getActiveDatabaseMode();
    if (mode === 'supabase' && supabase) {
      try {
        await supabase.from('users').insert({
          id,
          name: newUser.name,
          email: newUser.email,
          password_hash: newUser.password_hash,
          created_at: now
        });
      } catch (err) {
        console.warn('[Store] Supabase createUser failed, persisting to local store:', err);
      }
    }

    if (!this.localData.users) {
      this.localData.users = [];
    }
    this.localData.users.push(newUser);
    this.persistLocal();

    return {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      created_at: newUser.created_at
    };
  }

  public async authenticateUser(
    email: string,
    password: string
  ): Promise<{ success: boolean; user?: { id: string; name: string; email: string }; error?: string }> {
    if (!email || !password) {
      return { success: false, error: 'Invalid email or password.' };
    }

    const user = await this.findUserByEmail(email);
    if (!user) {
      return { success: false, error: 'Invalid email or password.' };
    }

    if (!verifyPassword(password, user.password_hash)) {
      return { success: false, error: 'Invalid email or password.' };
    }

    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    };
  }

  // ==========================================
  // EMAILS
  // ==========================================

  public async getEmails(filter?: {
    priority?: string;
    topic?: string;
    status?: string;
    search?: string;
    source?: string;
    isDemo?: boolean;
  }): Promise<Email[]> {
    const isDemoFilter = filter?.isDemo === true || filter?.source === 'demo';
    const isGmailFilter = filter?.source === 'gmail';
    const mode = await this.getActiveDatabaseMode();

    if (mode === 'supabase' && supabase) {
      try {
        let query = supabase.from('emails').select('*');

        if (filter?.status) {
          query = query.eq('status', filter.status);
        }
        if (filter?.priority && filter.priority !== 'All') {
          query = query.ilike('priority', filter.priority);
        }
        if (filter?.topic && filter.topic !== 'All') {
          query = query.ilike('topic', filter.topic);
        }
        if (filter?.search && filter.search.trim()) {
          const q = filter.search.trim();
          query = query.or(`sender.ilike.%${q}%,sender_name.ilike.%${q}%,subject.ilike.%${q}%,body.ilike.%${q}%,topic.ilike.%${q}%,summary.ilike.%${q}%`);
        }

        query = query.order('timestamp', { ascending: false });
        const { data, error } = await query;

        if (!error && data) {
          let filteredData = data;
          if (isDemoFilter) {
            filteredData = filteredData.filter(e => !(e.id && e.id.startsWith('gmail_') && !e.id.startsWith('gmail_msg_')));
          } else if (isGmailFilter) {
            filteredData = filteredData.filter(e => Boolean(e.id && e.id.startsWith('gmail_') && !e.id.startsWith('gmail_msg_')));
          }

          // Fetch thread messages for these emails
          const threadIds = Array.from(new Set(filteredData.map(e => e.thread_id).filter(Boolean)));
          let messagesMap: Record<string, ThreadMessage[]> = {};

          if (threadIds.length > 0) {
            const { data: msgData } = await supabase
              .from('thread_messages')
              .select('*')
              .in('thread_id', threadIds)
              .order('timestamp', { ascending: true });

            if (msgData) {
              msgData.forEach(m => {
                if (!messagesMap[m.thread_id]) messagesMap[m.thread_id] = [];
                messagesMap[m.thread_id].push(m);
              });
            }
          }

          return filteredData.map(e => ({
            ...e,
            messages: messagesMap[e.thread_id] || []
          }));
        }
      } catch (err) {
        console.warn('[Store] Supabase getEmails failed, falling back to local storage:', err);
      }
    }

    // Fallback Local Storage
    let result = [...this.localData.emails];

    if (isDemoFilter) {
      result = result.filter(e => !(e.id && e.id.startsWith('gmail_') && !e.id.startsWith('gmail_msg_')));
    } else if (isGmailFilter) {
      result = result.filter(e => Boolean(e.id && e.id.startsWith('gmail_') && !e.id.startsWith('gmail_msg_')));
    }

    if (filter?.status) {
      result = result.filter(e => e.status === filter.status);
    }
    if (filter?.priority && filter.priority !== 'All') {
      result = result.filter(e => e.priority.toLowerCase() === filter.priority?.toLowerCase());
    }
    if (filter?.topic && filter.topic !== 'All') {
      result = result.filter(e => e.topic.toLowerCase() === filter.topic?.toLowerCase());
    }
    if (filter?.search && filter.search.trim()) {
      const q = filter.search.toLowerCase().trim();
      result = result.filter(e =>
        e.sender.toLowerCase().includes(q) ||
        e.sender_name.toLowerCase().includes(q) ||
        e.subject.toLowerCase().includes(q) ||
        e.body.toLowerCase().includes(q) ||
        e.topic.toLowerCase().includes(q) ||
        e.summary.toLowerCase().includes(q)
      );
    }

    return result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public async getEmailById(id: string, markAsRead: boolean = true): Promise<Email | undefined> {
    const mode = await this.getActiveDatabaseMode();

    if (mode === 'supabase' && supabase) {
      try {
        if (markAsRead) {
          // Mark as read
          await supabase.from('emails').update({ is_read: true }).eq('id', id);
        }

        const { data, error } = await supabase.from('emails').select('*').eq('id', id).single();
        if (!error && data) {
          // Fetch thread messages
          const { data: messages } = await supabase
            .from('thread_messages')
            .select('*')
            .eq('thread_id', data.thread_id)
            .order('timestamp', { ascending: true });

          return {
            ...data,
            is_read: markAsRead ? true : (data.is_read ?? false),
            messages: messages || []
          };
        }
      } catch (err) {
        console.warn('[Store] Supabase getEmailById failed, falling back to local:', err);
      }
    }

    const email = this.localData.emails.find(e => e.id === id);
    if (email && markAsRead) {
      email.is_read = true;
      this.persistLocal();
    }
    return email;
  }

  public async updateEmail(id: string, patch: Partial<Email>): Promise<Email | undefined> {
    const mode = await this.getActiveDatabaseMode();

    if (mode === 'supabase' && supabase) {
      try {
        const { data, error } = await supabase
          .from('emails')
          .update(patch)
          .eq('id', id)
          .select()
          .single();

        if (!error && data) {
          // Keep local mirror updated
          const idx = this.localData.emails.findIndex(e => e.id === id);
          if (idx !== -1) this.localData.emails[idx] = { ...this.localData.emails[idx], ...patch };
          this.persistLocal();
          return data;
        }
      } catch (err) {
        console.warn('[Store] Supabase updateEmail failed, using local:', err);
      }
    }

    const idx = this.localData.emails.findIndex(e => e.id === id);
    if (idx === -1) return undefined;
    this.localData.emails[idx] = { ...this.localData.emails[idx], ...patch };
    this.persistLocal();
    return this.localData.emails[idx];
  }

  public async bulkUpdateEmails(ids: string[], patch: Partial<Email>): Promise<{ success: boolean; updatedCount: number }> {
    if (!ids || ids.length === 0) return { success: true, updatedCount: 0 };
    const mode = await this.getActiveDatabaseMode();

    if (mode === 'supabase' && supabase) {
      try {
        const { error } = await supabase
          .from('emails')
          .update(patch)
          .in('id', ids);

        if (!error) {
          ids.forEach(id => {
            const idx = this.localData.emails.findIndex(e => e.id === id);
            if (idx !== -1) this.localData.emails[idx] = { ...this.localData.emails[idx], ...patch };
          });
          this.persistLocal();
          return { success: true, updatedCount: ids.length };
        }
      } catch (err) {
        console.warn('[Store] Supabase bulkUpdateEmails failed, using local:', err);
      }
    }

    let count = 0;
    ids.forEach(id => {
      const idx = this.localData.emails.findIndex(e => e.id === id);
      if (idx !== -1) {
        this.localData.emails[idx] = { ...this.localData.emails[idx], ...patch };
        count++;
      }
    });
    this.persistLocal();
    return { success: true, updatedCount: count };
  }

  // ==========================================
  // THREADS
  // ==========================================

  public async getThreads(): Promise<Thread[]> {
    const mode = await this.getActiveDatabaseMode();

    if (mode === 'supabase' && supabase) {
      try {
        const { data: threads, error } = await supabase.from('threads').select('*');
        if (!error && threads) {
          const { data: messages } = await supabase.from('thread_messages').select('*').order('timestamp', { ascending: true });
          return threads.map(t => ({
            ...t,
            messages: (messages || []).filter(m => m.thread_id === t.id)
          }));
        }
      } catch (err) {
        console.warn('[Store] Supabase getThreads failed:', err);
      }
    }

    return this.localData.threads;
  }

  public async getThreadById(id: string): Promise<Thread | undefined> {
    const mode = await this.getActiveDatabaseMode();

    if (mode === 'supabase' && supabase) {
      try {
        const { data: thread, error } = await supabase.from('threads').select('*').eq('id', id).single();
        if (!error && thread) {
          const { data: messages } = await supabase
            .from('thread_messages')
            .select('*')
            .eq('thread_id', id)
            .order('timestamp', { ascending: true });

          return {
            ...thread,
            messages: messages || []
          };
        }
      } catch (err) {
        console.warn('[Store] Supabase getThreadById failed:', err);
      }
    }

    return this.localData.threads.find(t => t.id === id);
  }

  public async updateThread(id: string, patch: Partial<Thread>): Promise<Thread | undefined> {
    const mode = await this.getActiveDatabaseMode();

    // Prepare Supabase columns (exclude computed messages array)
    const { messages, ...threadFields } = patch;

    if (mode === 'supabase' && supabase) {
      try {
        const { data, error } = await supabase
          .from('threads')
          .update(threadFields)
          .eq('id', id)
          .select()
          .single();

        if (!error && data) {
          // If summary was updated, also update relevant emails linked to this thread
          if (patch.summary) {
            await supabase
              .from('emails')
              .update({ summary: patch.summary })
              .eq('thread_id', id);
          }

          // Fetch messages to return complete thread object
          const { data: threadMsgs } = await supabase
            .from('thread_messages')
            .select('*')
            .eq('thread_id', id)
            .order('timestamp', { ascending: true });

          const updatedThread: Thread = {
            ...data,
            messages: threadMsgs || []
          };

          // Mirror locally
          const idx = this.localData.threads.findIndex(t => t.id === id);
          if (idx !== -1) {
            this.localData.threads[idx] = { ...this.localData.threads[idx], ...patch };
            this.persistLocal();
          }

          return updatedThread;
        }
      } catch (err) {
        console.warn('[Store] Supabase updateThread failed, using local mirror:', err);
      }
    }

    const idx = this.localData.threads.findIndex(t => t.id === id);
    if (idx === -1) return undefined;
    this.localData.threads[idx] = { ...this.localData.threads[idx], ...patch };
    
    // Update local emails summary if summary changed
    if (patch.summary) {
      this.localData.emails.forEach(e => {
        if (e.thread_id === id) e.summary = patch.summary!;
      });
    }

    this.persistLocal();
    return this.localData.threads[idx];
  }

  // ==========================================
  // DRAFTS
  // ==========================================

  private formatDraft(d: any): Draft {
    return {
      id: d.id,
      email_id: d.email_id,
      content: d.content,
      subject: d.subject || d.tone_match_scores?.custom_subject,
      tone_value: d.tone_value || d.tone_match_scores?.tone_value || 3,
      tone_match_scores: d.tone_match_scores || {
        professional: true,
        concise: true,
        direct: true,
        preferred_greeting: true,
        preferred_signoff: true
      },
      status: d.status,
      created_at: d.created_at,
      updated_at: d.updated_at
    };
  }

  public async getDrafts(options?: { source?: string; isDemo?: boolean }): Promise<Draft[]> {
    const isDemoFilter = options?.isDemo === true || options?.source === 'demo';
    const isGmailFilter = options?.source === 'gmail';
    const mode = await this.getActiveDatabaseMode();

    let list: any[] = [];
    if (mode === 'supabase' && supabase) {
      try {
        const { data, error } = await supabase
          .from('drafts')
          .select('*')
          .eq('status', 'draft')
          .order('updated_at', { ascending: false });

        if (!error && data) list = data;
      } catch (err) {
        console.warn('[Store] Supabase getDrafts failed:', err);
        list = this.localData.drafts.filter(d => d.status === 'draft');
      }
    } else {
      list = this.localData.drafts.filter(d => d.status === 'draft');
    }

    if (isDemoFilter) {
      list = list.filter(d => !(d.email_id && d.email_id.startsWith('gmail_') && !d.email_id.startsWith('gmail_msg_')));
    } else if (isGmailFilter) {
      list = list.filter(d => Boolean(d.email_id && d.email_id.startsWith('gmail_') && !d.email_id.startsWith('gmail_msg_')));
    }

    return list.map(d => this.formatDraft(d));
  }

  public async getDraftByEmailId(emailId: string): Promise<Draft | undefined> {
    const mode = await this.getActiveDatabaseMode();

    if (mode === 'supabase' && supabase) {
      try {
        const { data, error } = await supabase
          .from('drafts')
          .select('*')
          .eq('email_id', emailId)
          .eq('status', 'draft')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data) return this.formatDraft(data);
      } catch (err) {
        console.warn('[Store] Supabase getDraftByEmailId failed:', err);
      }
    }

    const found = this.localData.drafts.find(d => d.email_id === emailId && d.status === 'draft');
    return found ? this.formatDraft(found) : undefined;
  }

  public async saveDraft(
    emailId: string,
    content: string,
    toneScores?: Draft['tone_match_scores'],
    subject?: string,
    toneValue?: number
  ): Promise<Draft> {
    const mode = await this.getActiveDatabaseMode();
    const now = new Date().toISOString();
    const scores = {
      ...(toneScores || {
        professional: true,
        concise: true,
        direct: true,
        preferred_greeting: true,
        preferred_signoff: true
      }),
      ...(toneValue !== undefined ? { tone_value: toneValue } : {}),
      ...(subject ? { custom_subject: subject } : {})
    };

    if (mode === 'supabase' && supabase) {
      try {
        // Check existing draft
        const { data: existing } = await supabase
          .from('drafts')
          .select('id')
          .eq('email_id', emailId)
          .eq('status', 'draft')
          .maybeSingle();

        if (existing) {
          const { data, error } = await supabase
            .from('drafts')
            .update({
              content,
              tone_match_scores: scores,
              updated_at: now
            })
            .eq('id', existing.id)
            .select()
            .single();

          if (!error && data) return this.formatDraft(data);
        } else {
          const draftId = `draft_${Date.now()}`;
          const { data, error } = await supabase
            .from('drafts')
            .insert({
              id: draftId,
              email_id: emailId,
              content,
              tone_match_scores: scores,
              status: 'draft',
              created_at: now,
              updated_at: now
            })
            .select()
            .single();

          if (!error && data) return this.formatDraft(data);
        }
      } catch (err) {
        console.warn('[Store] Supabase saveDraft failed, persisting to local storage:', err);
      }
    }

    // Local fallback
    const existingIdx = this.localData.drafts.findIndex(d => d.email_id === emailId && d.status === 'draft');
    if (existingIdx !== -1) {
      this.localData.drafts[existingIdx].content = content;
      this.localData.drafts[existingIdx].subject = subject;
      this.localData.drafts[existingIdx].tone_value = toneValue;
      this.localData.drafts[existingIdx].updated_at = now;
      this.localData.drafts[existingIdx].tone_match_scores = scores;
      this.persistLocal();
      return this.formatDraft(this.localData.drafts[existingIdx]);
    } else {
      const newDraft: Draft = {
        id: `draft_${Date.now()}`,
        email_id: emailId,
        subject,
        content,
        tone_value: toneValue,
        tone_match_scores: scores,
        status: 'draft',
        created_at: now,
        updated_at: now
      };
      this.localData.drafts.unshift(newDraft);
      this.persistLocal();
      return this.formatDraft(newDraft);
    }
  }

  public async sendDraft(
    emailId: string,
    draftContent?: string,
    draftSubject?: string
  ): Promise<{ success: boolean; sentEmail?: SentEmail; error?: string }> {
    const email = await this.getEmailById(emailId);
    if (!email) {
      return { success: false, error: 'Email not found' };
    }

    const draft = await this.getDraftByEmailId(emailId);
    const content = draftContent || draft?.content;

    if (!content || !content.trim()) {
      return { success: false, error: 'Draft content cannot be empty' };
    }

    // Duplicate send protection
    if (email.status === 'sent') {
      return { success: false, error: 'Reply has already been sent for this email.' };
    }
    if (draft && draft.status === 'sent') {
      return { success: false, error: 'This draft has already been sent.' };
    }

    const mode = await this.getActiveDatabaseMode();

    if (mode === 'supabase' && supabase) {
      try {
        const { data: existingSent } = await supabase
          .from('sent_emails')
          .select('id')
          .eq('original_email_id', emailId)
          .limit(1);
        if (existingSent && existingSent.length > 0) {
          return { success: false, error: 'Reply has already been sent for this email.' };
        }
      } catch (err) {
        console.warn('[Store] Supabase check existing sent failed:', err);
      }
    }

    const now = new Date().toISOString();
    const finalSubject = draftSubject || draft?.subject || (email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`);

    const sentRecord: SentEmail = {
      id: `sent_${Date.now()}`,
      original_email_id: emailId,
      recipient: email.sender,
      subject: finalSubject,
      body: content,
      sent_at: now,
      status: 'Sent'
    };

    if (mode === 'supabase' && supabase) {
      try {
        // 1. Insert into sent_emails
        await supabase.from('sent_emails').insert(sentRecord);

        // 2. Mark draft status = sent
        if (draft) {
          await supabase.from('drafts').update({ status: 'sent', updated_at: now }).eq('id', draft.id);
        }

        // 3. Mark email status = sent
        await supabase.from('emails').update({ status: 'sent', is_read: true }).eq('id', emailId);

        // 4. Record style example
        await supabase.from('style_examples').insert({
          id: `example_${Date.now()}`,
          user_id: DEMO_USER.id,
          sender: 'sai@techflow.io',
          recipient: sentRecord.recipient,
          subject: sentRecord.subject,
          body: sentRecord.body,
          timestamp: sentRecord.sent_at
        });
      } catch (err) {
        console.warn('[Store] Supabase sendDraft failed, updating local store:', err);
      }
    }

    // Update local mirror as well
    this.localData.sent_emails.unshift(sentRecord);
    if (draft) {
      const d = this.localData.drafts.find(x => x.id === draft.id);
      if (d) {
        d.status = 'sent';
        d.updated_at = now;
      }
    }
    const em = this.localData.emails.find(e => e.id === emailId);
    if (em) {
      em.status = 'sent';
      em.is_read = true;
    }
    this.localData.style_examples.unshift({
      id: sentRecord.id,
      recipient: sentRecord.recipient,
      subject: sentRecord.subject,
      body: sentRecord.body,
      timestamp: sentRecord.sent_at
    });
    this.persistLocal();

    return { success: true, sentEmail: sentRecord };
  }

  public async getSentEmails(options?: { source?: string; isDemo?: boolean }): Promise<SentEmail[]> {
    const isDemoFilter = options?.isDemo === true || options?.source === 'demo';
    const isGmailFilter = options?.source === 'gmail';
    const mode = await this.getActiveDatabaseMode();

    if (mode === 'supabase' && supabase) {
      try {
        const { data, error } = await supabase
          .from('sent_emails')
          .select('*')
          .order('sent_at', { ascending: false });

        if (!error && data) {
          let list = data;
          if (isDemoFilter) {
            list = list.filter(s => !s.id.startsWith('gmail_sent_'));
          } else if (isGmailFilter) {
            list = list.filter(s => s.id.startsWith('gmail_sent_'));
          }
          return list;
        }
      } catch (err) {
        console.warn('[Store] Supabase getSentEmails failed:', err);
      }
    }

    let result = [...this.localData.sent_emails];
    if (isDemoFilter) {
      result = result.filter(s => !s.id.startsWith('gmail_sent_'));
    } else if (isGmailFilter) {
      result = result.filter(s => s.id.startsWith('gmail_sent_'));
    }

    return result.sort(
      (a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
    );
  }

  public async recordRealGmailSent(sentRecord: SentEmail, threadId?: string): Promise<void> {
    const mode = await this.getActiveDatabaseMode();

    if (mode === 'supabase' && supabase) {
      try {
        await supabase.from('sent_emails').upsert(sentRecord);
        if (threadId) {
          await supabase.from('thread_messages').upsert({
            id: `tm_${sentRecord.id}`,
            thread_id: threadId,
            sender: 'me',
            sender_name: 'Me',
            recipient: sentRecord.recipient,
            subject: sentRecord.subject,
            body: sentRecord.body,
            timestamp: sentRecord.sent_at
          });
        }
      } catch (err) {
        console.warn('[Store] Supabase recordRealGmailSent failed:', err);
      }
    }

    const existsIdx = this.localData.sent_emails.findIndex(s => s.id === sentRecord.id);
    if (existsIdx !== -1) {
      this.localData.sent_emails[existsIdx] = sentRecord;
    } else {
      this.localData.sent_emails.unshift(sentRecord);
    }

    if (threadId) {
      const thread = this.localData.threads.find(t => t.id === threadId);
      if (thread) {
        const msgExists = thread.messages.some(m => m.id === `tm_${sentRecord.id}`);
        if (!msgExists) {
          thread.messages.push({
            id: `tm_${sentRecord.id}`,
            thread_id: threadId,
            sender: 'me',
            sender_name: 'Me',
            recipient: sentRecord.recipient,
            subject: sentRecord.subject,
            body: sentRecord.body,
            timestamp: sentRecord.sent_at
          });
          thread.message_count = thread.messages.length;
          thread.last_message_at = sentRecord.sent_at;
        }
      }
      const email = this.localData.emails.find(e => e.thread_id === threadId || e.id === sentRecord.original_email_id);
      if (email) {
        if (!email.messages) email.messages = [];
        const msgExists = email.messages.some(m => m.id === `tm_${sentRecord.id}`);
        if (!msgExists) {
          email.messages.push({
            id: `tm_${sentRecord.id}`,
            thread_id: threadId,
            sender: 'me',
            sender_name: 'Me',
            recipient: sentRecord.recipient,
            subject: sentRecord.subject,
            body: sentRecord.body,
            timestamp: sentRecord.sent_at
          });
        }
      }
    }

    this.persistLocal();
  }

  // ==========================================
  // STYLE PROFILE & EXAMPLES
  // ==========================================

  public async getStyleProfile(): Promise<UserStyleProfile> {
    const mode = await this.getActiveDatabaseMode();

    if (mode === 'supabase' && supabase) {
      try {
        const { data, error } = await supabase
          .from('user_style_profiles')
          .select('*')
          .eq('user_id', DEMO_USER.id)
          .maybeSingle();

        if (!error && data) return data;
      } catch (err) {
        console.warn('[Store] Supabase getStyleProfile failed:', err);
      }
    }

    return this.localData.user_style_profile;
  }

  public async updateStyleProfile(profile: Partial<UserStyleProfile>): Promise<UserStyleProfile> {
    const mode = await this.getActiveDatabaseMode();
    const updatedProfile = {
      ...this.localData.user_style_profile,
      ...profile,
      updated_at: new Date().toISOString()
    };

    if (mode === 'supabase' && supabase) {
      try {
        const { data, error } = await supabase
          .from('user_style_profiles')
          .upsert({
            id: updatedProfile.id || 'style_profile_default',
            user_id: DEMO_USER.id,
            tone: updatedProfile.tone,
            formality: updatedProfile.formality,
            sentence_length: updatedProfile.sentence_length,
            greeting: updatedProfile.greeting,
            signoff: updatedProfile.signoff,
            style_description: updatedProfile.style_description,
            learned_from_count: updatedProfile.learned_from_count,
            characteristics: updatedProfile.characteristics,
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (!error && data) {
          this.localData.user_style_profile = data;
          this.persistLocal();
          return data;
        }
      } catch (err) {
        console.warn('[Store] Supabase updateStyleProfile failed:', err);
      }
    }

    this.localData.user_style_profile = updatedProfile;
    this.persistLocal();
    return updatedProfile;
  }

  public async getStyleExamples(): Promise<StyleExample[]> {
    const mode = await this.getActiveDatabaseMode();

    if (mode === 'supabase' && supabase) {
      try {
        const { data, error } = await supabase
          .from('style_examples')
          .select('*')
          .order('timestamp', { ascending: false });

        if (!error && data) return data;
      } catch (err) {
        console.warn('[Store] Supabase getStyleExamples failed:', err);
      }
    }

    return this.localData.style_examples;
  }

  // ==========================================
  // DEMO DATA (Idempotent Load)
  // ==========================================

  public async resetToDemo(): Promise<{ emailsCount: number; sentCount: number; threadsCount: number }> {
    const mode = await this.getActiveDatabaseMode();

    if (mode === 'supabase' && supabase) {
      try {
        console.log('[Store] Loading demo dataset into Supabase PostgreSQL...');

        // 0. Preserve real Gmail records before wiping demo data.
        //    Real Gmail emails have IDs starting with 'gmail_' but NOT 'gmail_msg_' (those are demo sandbox).
        let gmailEmailsToPreserve: any[] = [];
        let gmailThreadIdsToPreserve: Set<string> = new Set();

        try {
          const { data: gmailRows } = await supabase
            .from('emails')
            .select('*')
            .like('id', 'gmail_%')
            .not('id', 'like', 'gmail_msg_%');

          if (gmailRows && gmailRows.length > 0) {
            gmailEmailsToPreserve = gmailRows;
            gmailRows.forEach(e => { if (e.thread_id) gmailThreadIdsToPreserve.add(e.thread_id); });
            console.log(`[Store] Protecting ${gmailEmailsToPreserve.length} real Gmail records from demo reset.`);
          }
        } catch (preserveErr) {
          console.warn('[Store] Could not fetch Gmail records to preserve:', preserveErr);
        }

        // 0b. Clean prior DEMO records only (non-Gmail rows)
        await supabase.from('drafts').delete().neq('id', '___');
        await supabase.from('sent_emails').delete().neq('id', '___');
        await supabase.from('style_examples').delete().neq('id', '___');

        // Delete only non-Gmail inbox emails
        if (gmailEmailsToPreserve.length > 0) {
          const gmailIds = gmailEmailsToPreserve.map(e => e.id);
          await supabase.from('emails').delete().not('id', 'in', `(${gmailIds.map(id => `"${id}"`).join(',')})`);
        } else {
          await supabase.from('emails').delete().neq('id', '___');
        }

        // Delete thread_messages and threads that are NOT linked to Gmail emails
        if (gmailThreadIdsToPreserve.size > 0) {
          const protectedThreadIds = Array.from(gmailThreadIdsToPreserve);
          await supabase.from('thread_messages').delete().not('thread_id', 'in', `(${protectedThreadIds.map(id => `"${id}"`).join(',')})`);
          await supabase.from('threads').delete().not('id', 'in', `(${protectedThreadIds.map(id => `"${id}"`).join(',')})`);
        } else {
          await supabase.from('thread_messages').delete().neq('id', '___');
          await supabase.from('threads').delete().neq('id', '___');
        }

        await supabase.from('user_style_profiles').delete().neq('id', '___');

        // 1. Upsert Demo User
        await supabase.from('users').upsert({
          id: DEMO_USER.id,
          name: DEMO_USER.name,
          email: DEMO_USER.email,
          created_at: new Date().toISOString()
        });

        // 2. Upsert Threads (exactly the 5 multi-message threads)
        for (const t of demoThreads) {
          await supabase.from('threads').upsert({
            id: t.id,
            subject: t.subject,
            summary: t.summary,
            message_count: t.message_count,
            last_message_at: t.last_message_at,
            created_at: new Date().toISOString()
          });

          // 3. Upsert Thread Messages
          if (t.messages && t.messages.length > 0) {
            for (const msg of t.messages) {
              await supabase.from('thread_messages').upsert({
                id: msg.id,
                thread_id: t.id,
                sender: msg.sender,
                sender_name: msg.sender_name,
                recipient: msg.recipient,
                subject: msg.subject,
                body: msg.body,
                timestamp: msg.timestamp,
                created_at: new Date().toISOString()
              });
            }
          }
        }

        // 4. Upsert Incoming Emails (27 emails)
        for (const email of demoEmails) {
          const isMultiThread = demoThreads.some(t => t.id === email.thread_id);
          await supabase.from('emails').upsert({
            id: email.id,
            thread_id: isMultiThread ? email.thread_id : null,
            sender: email.sender,
            sender_name: email.sender_name,
            recipient: email.recipient,
            subject: email.subject,
            body: email.body,
            timestamp: email.timestamp,
            priority: email.priority,
            topic: email.topic,
            summary: email.summary,
            is_read: email.is_read,
            status: email.status,
            created_at: email.created_at
          });
        }

        // 5. Upsert Sent Emails (exactly 12 sent emails from Sai)
        for (const sent of demoSentEmails) {
          await supabase.from('sent_emails').upsert({
            id: sent.id,
            original_email_id: null,
            recipient: sent.recipient,
            subject: sent.subject,
            body: sent.body,
            sent_at: sent.sent_at,
            status: sent.status
          });

          // Style example
          await supabase.from('style_examples').upsert({
            id: `ex_${sent.id}`,
            user_id: DEMO_USER.id,
            sender: 'sai@techflow.io',
            recipient: sent.recipient,
            subject: sent.subject,
            body: sent.body,
            timestamp: sent.sent_at,
            created_at: new Date().toISOString()
          });
        }

        // 6. Upsert User Style Profile
        await supabase.from('user_style_profiles').upsert({
          id: initialStyleProfile.id,
          user_id: DEMO_USER.id,
          tone: initialStyleProfile.tone,
          formality: initialStyleProfile.formality,
          sentence_length: initialStyleProfile.sentence_length,
          greeting: initialStyleProfile.greeting,
          signoff: initialStyleProfile.signoff,
          style_description: initialStyleProfile.style_description,
          learned_from_count: initialStyleProfile.learned_from_count,
          characteristics: initialStyleProfile.characteristics,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

        // 7. Initial Drafts
        await supabase.from('drafts').upsert({
          id: 'draft_01',
          email_id: 'email_01',
          content: `Hi Prof. Kumar,\n\nThanks for the update. We have completed the primary triage workflows and will finalize end-to-end integration testing by Thursday evening.\n\nWe are on track to submit the final demo package before Friday 5:00 PM EST.\n\nRegards,\nSai`,
          tone_match_scores: {
            professional: true,
            concise: true,
            direct: true,
            preferred_greeting: true,
            preferred_signoff: true
          },
          status: 'draft',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

        // 8. Restore preserved real Gmail email records (they were removed from emails table above)
        if (gmailEmailsToPreserve.length > 0) {
          for (const gmailEmail of gmailEmailsToPreserve) {
            await supabase.from('emails').upsert(gmailEmail);
          }
          console.log(`[Store] Restored ${gmailEmailsToPreserve.length} real Gmail records after demo reset.`);
        }

        console.log('[Store] Supabase PostgreSQL demo dataset successfully loaded.');
      } catch (err) {
        console.warn('[Store] Supabase resetToDemo encounter error, updating local storage:', err);
      }
    }

    // Local mirror update
    this.localData = this.getDefaultLocalData();
    this.persistLocal();

    return {
      emailsCount: this.localData.emails.length,
      sentCount: this.localData.sent_emails.length,
      threadsCount: this.localData.threads.length
    };
  }

  // ==========================================
  // IMPORT (CSV & JSON)
  // ==========================================

  public async importEmails(newEmails: Partial<Email>[], newSentEmails?: Partial<SentEmail>[]): Promise<{
    emailsImported: number;
    sentImported: number;
    threadsDetected: number;
  }> {
    const threadMap = new Map<string, number>();

    const processedEmails: Email[] = newEmails.map((e, index) => {
      const threadId = e.thread_id || `thread_imp_${Date.now()}_${index}`;
      threadMap.set(threadId, (threadMap.get(threadId) || 0) + 1);

      return {
        id: e.id || `email_imp_${Date.now()}_${index}`,
        thread_id: threadId,
        sender: e.sender || 'unknown@example.com',
        sender_name: e.sender_name || (e.sender ? e.sender.split('@')[0] : 'Unknown'),
        recipient: e.recipient || 'sai@techflow.io',
        subject: e.subject || 'No Subject',
        body: e.body || '',
        timestamp: e.timestamp || new Date().toISOString(),
        priority: e.priority || 'Normal',
        topic: e.topic || 'Work',
        summary: e.summary || (e.body ? e.body.slice(0, 120) + '...' : 'No summary'),
        is_read: false,
        status: 'inbox',
        messages: e.messages || [
          {
            id: `msg_${Date.now()}_${index}`,
            thread_id: threadId,
            sender: e.sender || 'unknown@example.com',
            sender_name: e.sender_name || 'Unknown',
            recipient: e.recipient || 'sai@techflow.io',
            subject: e.subject || 'No Subject',
            body: e.body || '',
            timestamp: e.timestamp || new Date().toISOString()
          }
        ],
        created_at: new Date().toISOString()
      };
    });

    let processedSent: SentEmail[] = [];
    if (newSentEmails && newSentEmails.length > 0) {
      processedSent = newSentEmails.map((s, idx) => ({
        id: s.id || `sent_imp_${Date.now()}_${idx}`,
        original_email_id: s.original_email_id || '',
        recipient: s.recipient || 'colleague@example.com',
        subject: s.subject || 'Re: Subject',
        body: s.body || '',
        sent_at: s.sent_at || new Date().toISOString(),
        status: 'Sent'
      }));
    }

    const mode = await this.getActiveDatabaseMode();

    if (mode === 'supabase' && supabase) {
      try {
        for (const email of processedEmails) {
          await supabase.from('emails').upsert({
            id: email.id,
            thread_id: email.thread_id,
            sender: email.sender,
            sender_name: email.sender_name,
            recipient: email.recipient,
            subject: email.subject,
            body: email.body,
            timestamp: email.timestamp,
            priority: email.priority,
            topic: email.topic,
            summary: email.summary,
            is_read: email.is_read,
            status: email.status,
            created_at: email.created_at
          });
        }

        for (const sent of processedSent) {
          await supabase.from('sent_emails').upsert(sent);
        }
      } catch (err) {
        console.warn('[Store] Supabase importEmails failed, updating local storage:', err);
      }
    }

    this.localData.emails = [...processedEmails, ...this.localData.emails];
    if (processedSent.length > 0) {
      this.localData.sent_emails = [...processedSent, ...this.localData.sent_emails];
    }
    this.persistLocal();

    return {
      emailsImported: processedEmails.length,
      sentImported: processedSent.length,
      threadsDetected: threadMap.size
    };
  }

  // ==========================================
  // STATS
  // ==========================================
  // ANALYTICS & STATS
  // ==========================================

  public async getDetailedAnalytics(options?: { source?: string; isDemo?: boolean }): Promise<DetailedAnalytics> {
    const isDemoFilter = options?.isDemo === true || options?.source === 'demo';
    const isGmailFilter = options?.source === 'gmail';
    const mode = await this.getActiveDatabaseMode();
    let emails: { id?: string; priority: string; topic: string; is_read: boolean; summary?: string }[] = [];
    let draftsCount = 0;
    let sentCount = 0;

    if (mode === 'supabase' && supabase) {
      try {
        const { data: eData } = await supabase.from('emails').select('id, priority, topic, is_read, summary');
        const { data: dData } = await supabase.from('drafts').select('id, email_id').eq('status', 'draft');
        const { data: sData } = await supabase.from('sent_emails').select('id');

        let rawEmails = eData || [];
        let rawDrafts = dData || [];
        let rawSent = sData || [];

        if (isDemoFilter) {
          rawEmails = rawEmails.filter(e => !(e.id && e.id.startsWith('gmail_') && !e.id.startsWith('gmail_msg_')));
          rawDrafts = rawDrafts.filter(d => !(d.email_id && d.email_id.startsWith('gmail_') && !d.email_id.startsWith('gmail_msg_')));
          rawSent = rawSent.filter(s => !s.id.startsWith('gmail_sent_'));
        } else if (isGmailFilter) {
          rawEmails = rawEmails.filter(e => Boolean(e.id && e.id.startsWith('gmail_') && !e.id.startsWith('gmail_msg_')));
          rawDrafts = rawDrafts.filter(d => Boolean(d.email_id && d.email_id.startsWith('gmail_') && !d.email_id.startsWith('gmail_msg_')));
          rawSent = rawSent.filter(s => s.id.startsWith('gmail_sent_'));
        }

        emails = rawEmails;
        draftsCount = rawDrafts.length;
        sentCount = rawSent.length;
      } catch (err) {
        console.warn('[Store] Supabase getDetailedAnalytics failed, falling back to local:', err);
        let rawEmails = this.localData.emails;
        let rawDrafts = this.localData.drafts.filter(d => d.status === 'draft');
        let rawSent = this.localData.sent_emails;

        if (isDemoFilter) {
          rawEmails = rawEmails.filter(e => !(e.id && e.id.startsWith('gmail_') && !e.id.startsWith('gmail_msg_')));
          rawDrafts = rawDrafts.filter(d => !(d.email_id && d.email_id.startsWith('gmail_') && !d.email_id.startsWith('gmail_msg_')));
          rawSent = rawSent.filter(s => !s.id.startsWith('gmail_sent_'));
        } else if (isGmailFilter) {
          rawEmails = rawEmails.filter(e => e.id.startsWith('gmail_') && !e.id.startsWith('gmail_msg_'));
          rawDrafts = rawDrafts.filter(d => d.email_id && d.email_id.startsWith('gmail_') && !d.email_id.startsWith('gmail_msg_'));
          rawSent = rawSent.filter(s => s.id.startsWith('gmail_sent_'));
        }

        emails = rawEmails;
        draftsCount = rawDrafts.length;
        sentCount = rawSent.length;
      }
    } else {
      let rawEmails = this.localData.emails;
      let rawDrafts = this.localData.drafts.filter(d => d.status === 'draft');
      let rawSent = this.localData.sent_emails;

      if (isDemoFilter) {
        rawEmails = rawEmails.filter(e => !(e.id && e.id.startsWith('gmail_') && !e.id.startsWith('gmail_msg_')));
        rawDrafts = rawDrafts.filter(d => !(d.email_id && d.email_id.startsWith('gmail_') && !d.email_id.startsWith('gmail_msg_')));
        rawSent = rawSent.filter(s => !s.id.startsWith('gmail_sent_'));
      } else if (isGmailFilter) {
        rawEmails = rawEmails.filter(e => e.id.startsWith('gmail_') && !e.id.startsWith('gmail_msg_'));
        rawDrafts = rawDrafts.filter(d => d.email_id && d.email_id.startsWith('gmail_') && !d.email_id.startsWith('gmail_msg_'));
        rawSent = rawSent.filter(s => s.id.startsWith('gmail_sent_'));
      }

      emails = rawEmails;
      draftsCount = rawDrafts.length;
      sentCount = rawSent.length;
    }

    const total = emails.length;
    const urgent = emails.filter(e => e.priority === 'Urgent').length;
    const normal = emails.filter(e => e.priority === 'Normal').length;
    const low = emails.filter(e => e.priority === 'Low').length;

    const actionRequired = emails.filter(e => e.topic === 'Action Required').length;
    const work = emails.filter(e => e.topic === 'Work').length;
    const personal = emails.filter(e => e.topic === 'Personal').length;
    const newsletter = emails.filter(e => e.topic === 'Newsletter').length;
    const other = emails.filter(e => e.topic === 'Other').length;

    const unreadCount = emails.filter(e => !e.is_read).length;
    const triagedCount = emails.filter(e => e.summary && e.summary.trim().length > 0).length;
    const triagePercentage = total > 0 ? Math.round((triagedCount / total) * 100) : 0;

    const estimatedMinutesSaved = Math.round((triagedCount * 2.5) + (sentCount * 5));
    const responseRate = (total + sentCount) > 0 ? Math.round((sentCount / Math.max(1, (total + sentCount))) * 100) : 0;

    const safeTotal = Math.max(1, total);

    return {
      total,
      urgent,
      normal,
      low,
      actionRequired,
      work,
      personal,
      newsletter,
      other,
      draftsCount,
      sentCount,
      unreadCount,
      triagedCount,
      triagePercentage,
      estimatedMinutesSaved,
      priorityDistribution: {
        urgent: { count: urgent, percentage: Math.round((urgent / safeTotal) * 100) },
        normal: { count: normal, percentage: Math.round((normal / safeTotal) * 100) },
        low: { count: low, percentage: Math.round((low / safeTotal) * 100) }
      },
      topicDistribution: {
        work: { count: work, percentage: Math.round((work / safeTotal) * 100) },
        personal: { count: personal, percentage: Math.round((personal / safeTotal) * 100) },
        newsletter: { count: newsletter, percentage: Math.round((newsletter / safeTotal) * 100) },
        actionRequired: { count: actionRequired, percentage: Math.round((actionRequired / safeTotal) * 100) },
        other: { count: other, percentage: Math.round((other / safeTotal) * 100) }
      },
      triageProgress: {
        total,
        triaged: triagedCount,
        untriaged: Math.max(0, total - triagedCount),
        percentage: triagePercentage
      },
      mailboxHealth: {
        totalInbox: total,
        unread: unreadCount,
        drafts: draftsCount,
        sent: sentCount,
        responseRatePercentage: responseRate
      }
    };
  }

  public async getStats(options?: { source?: string; isDemo?: boolean }): Promise<Stats> {
    const analytics = await this.getDetailedAnalytics(options);
    return {
      total: analytics.total,
      urgent: analytics.urgent,
      actionRequired: analytics.actionRequired,
      normal: analytics.normal,
      low: analytics.low,
      draftsCount: analytics.draftsCount,
      sentCount: analytics.sentCount,
      unreadCount: analytics.unreadCount,
      estimatedMinutesSaved: analytics.estimatedMinutesSaved,
      work: analytics.work,
      personal: analytics.personal,
      newsletter: analytics.newsletter,
      other: analytics.other,
      triagedCount: analytics.triagedCount,
      triagePercentage: analytics.triagePercentage
    };
  }

  // ==========================================
  // GMAIL INTEGRATION (REAL OAUTH & DEMO SANDBOX)
  // ==========================================

  public getGmailStatus(): GmailStatus {
    return gmailService.getStatus();
  }

  public connectGmailDemo(accountEmail: string = 'alex.morgan@gmail.com'): GmailStatus {
    return gmailService.connectDemo(accountEmail);
  }

  public async disconnectGmail(): Promise<GmailStatus> {
    return await gmailService.disconnect();
  }

  public disconnectGmailDemo(): GmailStatus {
    gmailService.disconnect();
    return gmailService.getStatus();
  }

  public recordGmailSync(count: number): GmailStatus {
    return gmailService.recordDemoSync(count);
  }
}

export const store = new StoreService();
