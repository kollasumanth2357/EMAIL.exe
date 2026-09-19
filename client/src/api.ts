import { Email, Thread, Draft, SentEmail, UserStyleProfile, Stats, StyleExample, ImportStats, BatchTriageStats, DetailedAnalytics, GmailStatus, BulkActionResult } from './types';

const API_BASE = '/api';

function getAuthHeaders(): Record<string, string> {
  try {
    const stored = localStorage.getItem('mailpilot_auth_user');
    if (stored) {
      const user = JSON.parse(stored);
      if (user?.isDemo) {
        return { 'x-is-demo': 'true' };
      }
    }
  } catch {
    // Ignore JSON parse errors
  }
  return {};
}

export async function loginApi(email: string, password: string): Promise<{ id: string; name: string; email: string }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Invalid email or password.');
  }
  return data.user;
}

export async function registerApi(name: string, email: string, password: string): Promise<{ id: string; name: string; email: string }> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ name, email, password })
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Registration failed.');
  }
  return data.user;
}

export async function demoAuthApi(): Promise<{ id: string; name: string; email: string; isDemo: boolean }> {
  const res = await fetch(`${API_BASE}/auth/demo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
  });
  const data = await res.json();
  return data.user || { id: 'user-sai', name: 'Sai', email: 'sai@mailpilot.demo', isDemo: true };
}

export async function fetchEmails(params?: {
  priority?: string;
  topic?: string;
  status?: string;
  search?: string;
}): Promise<Email[]> {
  const query = new URLSearchParams();
  if (params?.priority) query.append('priority', params.priority);
  if (params?.topic) query.append('topic', params.topic);
  if (params?.status) query.append('status', params.status);
  if (params?.search) query.append('search', params.search);

  const res = await fetch(`${API_BASE}/emails?${query.toString()}`, {
    headers: { ...getAuthHeaders() }
  });
  if (!res.ok) throw new Error('Failed to fetch emails');
  const data = await res.json();
  return data.emails || [];
}

export async function fetchEmailById(id: string): Promise<{
  email: Email;
  thread: Thread;
  draft: Draft | null;
  markReadError?: string | null;
  verifiedRead?: boolean;
}> {
  const res = await fetch(`${API_BASE}/emails/${id}`, {
    headers: { ...getAuthHeaders() }
  });
  if (!res.ok) throw new Error('Failed to fetch email details');
  const data = await res.json();
  return data;
}

export async function markEmailAsRead(id: string): Promise<{
  success: boolean;
  email: Email;
  verifiedGmailRead?: boolean;
}> {
  const res = await fetch(`${API_BASE}/emails/${id}/mark-read`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to mark email as read');
  }
  return res.json();
}

export async function loadDemoInbox(): Promise<{
  emailsCount: number;
  sentCount: number;
  threadsCount: number;
}> {
  const res = await fetch(`${API_BASE}/emails/load-demo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
  });
  if (!res.ok) throw new Error('Failed to load demo inbox');
  return res.json();
}

export async function importEmails(formData: FormData): Promise<{
  success: boolean;
  message?: string;
  stats: ImportStats;
  sample?: any[];
}> {
  const res = await fetch(`${API_BASE}/import`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
    body: formData
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to import emails');
  }
  return res.json();
}

export async function loadEnronSample(limit: number = 75): Promise<{
  success: boolean;
  message?: string;
  stats: ImportStats;
}> {
  const res = await fetch(`${API_BASE}/import/enron-sample`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ limit })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to load Enron sample');
  }
  return res.json();
}

export async function importInboxData(formData: FormData): Promise<{
  emailsImported: number;
  sentImported: number;
  threadsDetected: number;
}> {
  const res = await fetch(`${API_BASE}/emails/import`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
    body: formData
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to import inbox data');
  }
  return res.json();
}

export async function analyzeEmails(limit?: number): Promise<BatchTriageStats> {
  const res = await fetch(`${API_BASE}/emails/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(limit ? { limit } : {})
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to analyze emails');
  }
  return res.json();
}

export async function triageEmail(id: string): Promise<{
  success: boolean;
  email: Email;
  classification?: any;
}> {
  const res = await fetch(`${API_BASE}/emails/${id}/triage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to triage email');
  }
  return res.json();
}

export async function summarizeThread(threadId: string): Promise<{
  success: boolean;
  thread_id: string;
  summary: string;
  thread?: Thread;
  isFallback?: boolean;
}> {
  const res = await fetch(`${API_BASE}/threads/${threadId}/summarize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to summarize thread');
  }
  return res.json();
}

export async function analyzeInbox(): Promise<{
  triagedCount: number;
  styleProfile: UserStyleProfile;
}> {
  const res = await fetch(`${API_BASE}/emails/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
  });
  if (!res.ok) throw new Error('Failed to analyze inbox');
  return res.json();
}

export async function generateReply(
  emailId: string,
  options?: { tone?: number; brevity?: string; subject?: string }
): Promise<{
  draft: Draft;
  styleProfile: UserStyleProfile;
  toneUsed?: number;
}> {
  const res = await fetch(`${API_BASE}/emails/${emailId}/generate-reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(options || {})
  });
  if (!res.ok) throw new Error('Failed to generate reply');
  return res.json();
}

export async function regenerateDraft(
  targetId: string,
  options?: { tone?: number; brevity?: string; subject?: string }
): Promise<{
  draft: Draft;
  styleProfile: UserStyleProfile;
  toneUsed?: number;
}> {
  const res = await fetch(`${API_BASE}/drafts/${targetId}/regenerate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(options || {})
  });
  if (!res.ok) throw new Error('Failed to regenerate draft');
  return res.json();
}

export async function saveDraft(
  emailId: string,
  content: string,
  subject?: string,
  tone?: number
): Promise<Draft> {
  const res = await fetch(`${API_BASE}/drafts/${emailId}/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ email_id: emailId, content, subject, tone })
  });
  if (!res.ok) throw new Error('Failed to save draft');
  const data = await res.json();
  return data.draft;
}

export async function approveAndSend(
  emailId: string,
  content: string,
  subject?: string
): Promise<{
  success: boolean;
  message?: string;
  sentEmail: SentEmail;
  dispatch_mode?: 'gmail_api' | 'demo_simulation';
  gmailSent?: boolean;
  gmailSendError?: string | null;
  gmailMessageId?: string | null;
  gmailThreadId?: string | null;
}> {
  const res = await fetch(`${API_BASE}/drafts/${emailId}/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ email_id: emailId, content, subject })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to send reply');
  }
  return res.json();
}

export async function fetchSentEmails(): Promise<SentEmail[]> {
  const res = await fetch(`${API_BASE}/sent`, {
    headers: { ...getAuthHeaders() }
  });
  if (!res.ok) throw new Error('Failed to fetch sent emails');
  const data = await res.json();
  return data.sent || [];
}

export async function fetchDrafts(): Promise<Draft[]> {
  const res = await fetch(`${API_BASE}/drafts`, {
    headers: { ...getAuthHeaders() }
  });
  if (!res.ok) throw new Error('Failed to fetch drafts');
  const data = await res.json();
  return data.drafts || [];
}

export async function fetchStyleProfile(): Promise<{
  profile: UserStyleProfile;
  examples: StyleExample[];
  comparison: {
    pastEmail: { recipient: string; subject: string; body: string };
    aiGeneratedReply: { recipient: string; subject: string; body: string };
  };
}> {
  const res = await fetch(`${API_BASE}/style`, {
    headers: { ...getAuthHeaders() }
  });
  if (!res.ok) throw new Error('Failed to fetch writing style profile');
  return res.json();
}

export async function fetchStats(): Promise<Stats> {
  const res = await fetch(`${API_BASE}/stats`, {
    headers: { ...getAuthHeaders() }
  });
  if (!res.ok) throw new Error('Failed to fetch stats');
  const data = await res.json();
  return data.stats;
}

export async function learnStyleProfile(): Promise<{
  success: boolean;
  profile: UserStyleProfile;
}> {
  const res = await fetch(`${API_BASE}/style/learn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to learn writing style profile');
  }
  return res.json();
}

export async function bulkTriageEmails(email_ids: string[]): Promise<BulkActionResult> {
  const res = await fetch(`${API_BASE}/emails/bulk-triage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ email_ids })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Bulk triage failed');
  }
  return res.json();
}

export async function bulkUpdateEmails(
  email_ids: string[],
  patch: { is_read?: boolean; status?: string; priority?: string; topic?: string }
): Promise<BulkActionResult> {
  const res = await fetch(`${API_BASE}/emails/bulk-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ email_ids, ...patch })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Bulk update failed');
  }
  return res.json();
}

export async function fetchAnalytics(): Promise<{
  analytics: DetailedAnalytics;
  stats: Stats;
}> {
  const res = await fetch(`${API_BASE}/analytics`, {
    headers: { ...getAuthHeaders() }
  });
  if (!res.ok) throw new Error('Failed to fetch analytics');
  return res.json();
}

export async function fetchGmailStatus(): Promise<GmailStatus> {
  const res = await fetch(`${API_BASE}/gmail/status`, {
    headers: { ...getAuthHeaders() }
  });
  if (!res.ok) throw new Error('Failed to fetch Gmail status');
  return res.json();
}

export async function connectGmailDemo(accountEmail?: string): Promise<GmailStatus> {
  const res = await fetch(`${API_BASE}/gmail/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ accountEmail })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to connect Gmail demo');
  }
  return res.json();
}

export const GMAIL_OAUTH_START_URL = `${API_BASE}/gmail/oauth/start`;

export async function disconnectGmail(): Promise<GmailStatus> {
  const res = await fetch(`${API_BASE}/gmail/disconnect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to disconnect Gmail');
  }
  return res.json();
}

export const disconnectGmailDemo = disconnectGmail;

export async function syncGmail(): Promise<{
  success: boolean;
  message: string;
  stats: ImportStats;
  gmailStatus: GmailStatus;
}> {
  const res = await fetch(`${API_BASE}/gmail/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to sync Gmail');
  }
  return res.json();
}

export const syncGmailDemo = syncGmail;

export async function fetchSettings(): Promise<any> {
  const res = await fetch(`${API_BASE}/settings`, {
    headers: { ...getAuthHeaders() }
  });
  if (!res.ok) throw new Error('Failed to fetch settings');
  return res.json();
}

