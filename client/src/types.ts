export type Priority = 'Urgent' | 'Normal' | 'Low';
export type Topic = 'Work' | 'Personal' | 'Newsletter' | 'Action Required' | 'Other';
export type EmailStatus = 'inbox' | 'archived' | 'sent';

export interface ThreadMessage {
  id: string;
  thread_id: string;
  sender: string;
  sender_name: string;
  recipient: string;
  subject: string;
  body: string;
  timestamp: string;
}

export interface Email {
  id: string;
  thread_id: string;
  sender: string;
  sender_name: string;
  recipient: string;
  subject: string;
  body: string;
  timestamp: string;
  priority: Priority;
  topic: Topic;
  summary: string;
  is_read: boolean;
  status: EmailStatus;
  messages?: ThreadMessage[];
  created_at: string;
}

export interface Thread {
  id: string;
  subject: string;
  summary: string;
  message_count: number;
  last_message_at: string;
  messages: ThreadMessage[];
}

export interface Draft {
  id: string;
  email_id: string;
  subject?: string;
  content: string;
  tone_value?: number;
  tone_match_scores: {
    professional: boolean;
    concise: boolean;
    direct: boolean;
    preferred_greeting: boolean;
    preferred_signoff: boolean;
  };
  status: 'draft' | 'sent';
  created_at: string;
  updated_at: string;
  email_subject?: string;
  email_sender?: string;
  email_sender_name?: string;
  email_priority?: Priority;
  email_topic?: Topic;
}

export interface SentEmail {
  id: string;
  original_email_id: string;
  recipient: string;
  subject: string;
  body: string;
  sent_at: string;
  status: 'Sent';
}

export interface UserStyleProfile {
  id: string;
  tone: string;
  formality: string;
  sentence_length: string;
  greeting: string;
  signoff: string;
  style_description: string;
  learned_from_count: number;
  characteristics: string[];
}

export interface StyleExample {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  timestamp: string;
}

export interface Stats {
  total: number;
  urgent: number;
  actionRequired: number;
  normal: number;
  low: number;
  draftsCount: number;
  sentCount: number;
  unreadCount: number;
  estimatedMinutesSaved: number;
  work?: number;
  personal?: number;
  newsletter?: number;
  other?: number;
  triagedCount?: number;
  triagePercentage?: number;
}

export interface DetailedAnalytics extends Stats {
  priorityDistribution: {
    urgent: { count: number; percentage: number };
    normal: { count: number; percentage: number };
    low: { count: number; percentage: number };
  };
  topicDistribution: {
    work: { count: number; percentage: number };
    personal: { count: number; percentage: number };
    newsletter: { count: number; percentage: number };
    actionRequired: { count: number; percentage: number };
    other: { count: number; percentage: number };
  };
  triageProgress: {
    total: number;
    triaged: number;
    untriaged: number;
    percentage: number;
  };
  mailboxHealth: {
    totalInbox: number;
    unread: number;
    drafts: number;
    sent: number;
    responseRatePercentage: number;
  };
}

export interface GmailStatus {
  connected: boolean;
  mode: 'real' | 'demo' | 'live';
  accountEmail: string;
  scopes: string[];
  lastSync: string | null;
  messagesImported: number;
  configured: boolean;
  isOAuthConfigured?: boolean;
  missingEnv: string[];
  note: string;
  authUrl?: string;
}

export interface ImportStats {
  imported: number;
  skipped: number;
  duplicates: number;
  inbox: number;
  sent: number;
  threads: number;
  errors: number;
}

export interface BatchTriageStats {
  success: boolean;
  processed: number;
  successful: number;
  fallback: number;
  failed: number;
  triagedCount?: number;
  message?: string;
}

export interface BulkActionResult {
  success: boolean;
  processed: number;
  successful?: number;
  fallback?: number;
  failed?: number;
  updatedCount?: number;
  message?: string;
}



