import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Email, Thread, Draft, UserStyleProfile, SentEmail } from '../types';
import { fetchEmailById, generateReply, saveDraft, approveAndSend, fetchStyleProfile, triageEmail, summarizeThread } from '../api';
import { PriorityBadge, TopicBadge, AvatarBadge, formatTimestamp } from '../components/Badges';
import { Toast } from '../components/UIComponents';
import {
  ArrowLeft,
  Sparkles,
  RefreshCw,
  Save,
  Send,
  CheckCircle2,
  Check,
  Clock,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Sliders,
  RotateCcw
} from 'lucide-react';

export const EmailDetailPage: React.FC<{ onRefreshStats?: () => void }> = ({ onRefreshStats }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [email, setEmail] = useState<Email | null>(null);
  const [thread, setThread] = useState<Thread | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [styleProfile, setStyleProfile] = useState<UserStyleProfile | null>(null);

  const [draftText, setDraftText] = useState('');
  const [draftSubject, setDraftSubject] = useState('');
  const [toneValue, setToneValue] = useState<number>(3);
  const [originalSavedText, setOriginalSavedText] = useState('');
  const [originalSavedSubject, setOriginalSavedSubject] = useState('');

  const [loading, setLoading] = useState(true);
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);

  // Collapsed states for past messages in thread
  const [collapsedMessages, setCollapsedMessages] = useState<Record<string, boolean>>({});

  // Sent Confirmation Modal
  const [sentResult, setSentResult] = useState<SentEmail | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // AI Triage & Thread Summarize loading states
  const [triagingEmail, setTriagingEmail] = useState(false);
  const [summarizingThread, setSummarizingThread] = useState(false);

  const getToneLabel = (val: number): string => {
    switch (val) {
      case 1: return 'More Casual';
      case 2: return 'Slightly Casual';
      case 3: return 'Balanced';
      case 4: return 'More Formal';
      case 5: return 'Highly Formal';
      default: return 'Balanced';
    }
  };

  const isDirty = (draftText !== originalSavedText) || (draftSubject !== originalSavedSubject);

  const handleTriageEmail = async () => {
    if (!email) return;
    try {
      setTriagingEmail(true);
      const res = await triageEmail(email.id);
      setEmail(res.email);
      setToastMessage(`Email triaged: ${res.email.priority} priority, ${res.email.topic} topic.`);
      setTimeout(() => setToastMessage(null), 3500);
      if (onRefreshStats) onRefreshStats();
    } catch (err: any) {
      console.error('Triage failed:', err);
      setToastMessage('Failed to triage email: ' + (err.message || 'Unknown error'));
      setTimeout(() => setToastMessage(null), 3500);
    } finally {
      setTriagingEmail(false);
    }
  };

  const handleSummarizeThread = async () => {
    const targetThreadId = thread?.id || email?.thread_id;
    if (!targetThreadId) return;
    try {
      setSummarizingThread(true);
      const res = await summarizeThread(targetThreadId);
      if (thread) {
        setThread({ ...thread, summary: res.summary });
      }
      setEmail((prev) => (prev ? { ...prev, summary: res.summary } : null));
      setToastMessage('Thread summarized strictly in 2 concise lines.');
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err: any) {
      console.error('Summarize thread failed:', err);
      setToastMessage('Failed to summarize thread: ' + (err.message || 'Unknown error'));
      setTimeout(() => setToastMessage(null), 3500);
    } finally {
      setSummarizingThread(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    loadData(id);
  }, [id]);

  const loadData = async (emailId: string) => {
    try {
      setLoading(true);
      const [emailData, styleData] = await Promise.all([
        fetchEmailById(emailId),
        fetchStyleProfile().catch(() => null)
      ]);

      setEmail(emailData.email);
      setThread(emailData.thread);
      setStyleProfile(styleData ? styleData.profile : null);

      const defaultSubject = emailData.email.subject.startsWith('Re:')
        ? emailData.email.subject
        : `Re: ${emailData.email.subject}`;

      if (emailData.draft) {
        setDraft(emailData.draft);
        setDraftText(emailData.draft.content);
        setDraftSubject(emailData.draft.subject || defaultSubject);
        setToneValue(emailData.draft.tone_value || 3);
        setOriginalSavedText(emailData.draft.content);
        setOriginalSavedSubject(emailData.draft.subject || defaultSubject);
      } else {
        setDraftSubject(defaultSubject);
        setOriginalSavedSubject(defaultSubject);
      }

      if (emailData.markReadError) {
        setToastMessage(`Could not mark this Gmail message as read: ${emailData.markReadError}`);
        setTimeout(() => setToastMessage(null), 6000);
      }
    } catch (err) {
      console.error('Failed to load email details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReply = async (emailId: string, overrideTone?: number) => {
    const targetTone = overrideTone !== undefined ? overrideTone : toneValue;
    try {
      setGeneratingDraft(true);
      const res = await generateReply(emailId, { tone: targetTone, subject: draftSubject });
      setDraft(res.draft);
      setDraftText(res.draft.content);
      if (res.draft.subject) {
        setDraftSubject(res.draft.subject);
        setOriginalSavedSubject(res.draft.subject);
      }
      setOriginalSavedText(res.draft.content);
      setToneValue(res.draft.tone_value || targetTone);
      setStyleProfile(res.styleProfile);
      setToastMessage(`Draft generated with ${getToneLabel(targetTone)} tone.`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error('Failed to generate draft:', err);
      setToastMessage('Failed to generate draft.');
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setGeneratingDraft(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!email) return;
    try {
      setSavingDraft(true);
      const updated = await saveDraft(email.id, draftText, draftSubject, toneValue);
      setDraft(updated);
      setOriginalSavedText(draftText);
      setOriginalSavedSubject(draftSubject);
      setToastMessage('Draft saved successfully.');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error('Failed to save draft:', err);
      setToastMessage('Failed to save draft.');
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setSavingDraft(false);
    }
  };

  const handleDiscardEdits = () => {
    setDraftText(originalSavedText);
    setDraftSubject(originalSavedSubject);
    setToastMessage('Reverted unsaved edits.');
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleApproveAndSend = async () => {
    if (!email || !draftText.trim()) return;

    if (email.status === 'sent' || draft?.status === 'sent') {
      alert('This email has already been sent.');
      return;
    }

    try {
      setSendingReply(true);
      const res = await approveAndSend(email.id, draftText, draftSubject);
      if (res.success && res.sentEmail) {
        setSentResult(res.sentEmail);
        setDraft((prev) => (prev ? { ...prev, status: 'sent' } : null));
        setEmail((prev) => (prev ? { ...prev, status: 'sent' } : null));
        setShowConfirmation(true);
        if (onRefreshStats) onRefreshStats();

        // Show a Gmail-specific toast if the reply was dispatched via Gmail API
        if (res.gmailSent) {
          setToastMessage('Reply sent via Gmail — visible in your Sent folder and original thread.');
          setTimeout(() => setToastMessage(null), 5000);
        } else if (res.gmailSendError) {
          setToastMessage(`Reply saved locally. Gmail send: ${res.gmailSendError}`);
          setTimeout(() => setToastMessage(null), 6000);
        }
      }
    } catch (err: any) {
      alert(err.message || 'Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };


  const toggleMessageCollapse = (msgId: string) => {
    setCollapsedMessages((prev) => ({
      ...prev,
      [msgId]: !prev[msgId]
    }));
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 bg-white">
        <div className="text-center space-y-2">
          <div className="inline-block w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500">Loading conversation...</p>
        </div>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="flex-1 p-12 text-center bg-white">
        <p className="text-slate-500 text-xs">Email not found.</p>
        <button
          onClick={() => navigate('/inbox')}
          className="mt-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-md hover:bg-slate-800"
        >
          Return to Inbox
        </button>
      </div>
    );
  }

  const threadMessages = email.messages || thread?.messages || [];
  const hasMultipleMessages = threadMessages.length > 1;

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto bg-white font-sans">
      {/* Top Header: Navigation & Context Badges */}
      <div className="px-8 py-3.5 border-b border-slate-200/80 bg-[#fafaf9]/80 backdrop-blur-xs sticky top-0 z-10 flex items-center justify-between">
        <button
          onClick={() => navigate('/inbox')}
          className="inline-flex items-center space-x-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Inbox</span>
        </button>

        <div className="flex items-center space-x-2">
          <TopicBadge topic={email.topic} size="sm" />
          <PriorityBadge priority={email.priority} size="sm" />
          {email.status === 'sent' && (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 text-[11px] font-medium rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3 h-3" />
              <span>Replied</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Email Reading View + AI Draft Composer */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-8 py-7 space-y-8">
        {/* Toast alert */}
        {toastMessage && (
          <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
        )}

        {/* Email Header: Document Hierarchy */}
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight leading-snug">
            {email.subject}
          </h1>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center space-x-3">
              <AvatarBadge name={email.sender_name} email={email.sender} size="md" />
              <div>
                <div className="flex items-baseline space-x-2">
                  <span className="text-xs font-semibold text-slate-900">{email.sender_name}</span>
                  <span className="text-[11px] text-slate-400 font-mono">&lt;{email.sender}&gt;</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  To: <span className="text-slate-700">{email.recipient}</span>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>{formatTimestamp(email.timestamp)}</span>
            </div>
          </div>
        </div>

        {/* AI INSIGHTS PANEL (Feature 1, 2, 4) */}
        <div className="rounded-lg border border-slate-200/90 bg-[#fafaf9] p-4 space-y-3 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-950">
                AI Summary & Classification
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <PriorityBadge priority={email.priority} size="sm" />
              <TopicBadge topic={email.topic} size="sm" />

              <button
                onClick={handleTriageEmail}
                disabled={triagingEmail}
                title="Re-classify priority and topic with Groq AI"
                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-2xs transition-all active:scale-95 disabled:opacity-50"
              >
                <Sparkles className={`w-3 h-3 text-indigo-600 ${triagingEmail ? 'animate-spin' : ''}`} />
                <span>{triagingEmail ? 'Analyzing...' : 'Analyze with AI'}</span>
              </button>
            </div>
          </div>

          <div className="border-t border-slate-200/60 pt-2.5">
            <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400 mb-1">
              AI Summary
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-normal whitespace-pre-line">
              {email.summary || 'Summary generated automatically from message content.'}
            </p>
          </div>
        </div>

        {/* THREAD 2-LINE SUMMARIZATION CARD (Feature 5 & 6) */}
        {hasMultipleMessages && (
          <div className="rounded-lg border border-purple-200 bg-purple-50/25 p-4 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-3.5 h-3.5 text-purple-700" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-950">
                  Thread Summary ({threadMessages.length} messages)
                </span>
              </div>

              <button
                onClick={handleSummarizeThread}
                disabled={summarizingThread}
                title="Regenerate 2-line conversation summary"
                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-medium text-purple-900 bg-white border border-purple-200 hover:bg-purple-50 shadow-2xs transition-all active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 text-purple-600 ${summarizingThread ? 'animate-spin' : ''}`} />
                <span>{summarizingThread ? 'Summarizing...' : 'Regenerate Summary'}</span>
              </button>
            </div>

            <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-line font-medium">
              {thread?.summary || email.summary}
            </p>
          </div>
        )}

        {/* Email Body & Thread Timeline */}
        <div className="space-y-4">
          {hasMultipleMessages ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500 uppercase tracking-wider pb-1">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Conversation Timeline ({threadMessages.length} messages)</span>
              </div>

              <div className="space-y-3">
                {threadMessages.map((msg, idx) => {
                  const isLatest = idx === threadMessages.length - 1;
                  const isCollapsed = collapsedMessages[msg.id] && !isLatest;
                  const isUser = msg.sender.includes('sai@techflow.io') || msg.sender.includes('sai@mailpilot.demo');

                  return (
                    <div
                      key={msg.id || idx}
                      className={`rounded-lg border transition-all ${
                        isLatest
                          ? 'border-slate-300 bg-white shadow-2xs'
                          : 'border-slate-200 bg-[#fafaf9]/70'
                      }`}
                    >
                      {/* Message Header */}
                      <div
                        onClick={() => !isLatest && toggleMessageCollapse(msg.id)}
                        className={`p-3.5 flex items-center justify-between ${
                          !isLatest ? 'cursor-pointer hover:bg-slate-100/50' : ''
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <AvatarBadge name={msg.sender_name} email={msg.sender} size="sm" />
                          <div>
                            <span className="text-xs font-semibold text-slate-900">
                              {msg.sender_name}
                            </span>
                            {isUser && (
                              <span className="ml-1.5 text-[10px] px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-medium">
                                You
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <span className="text-[11px] text-slate-400">
                            {formatTimestamp(msg.timestamp)}
                          </span>
                          {!isLatest && (
                            <button className="text-slate-400 hover:text-slate-600">
                              {isCollapsed ? (
                                <ChevronDown className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronUp className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Message Body */}
                      {!isCollapsed && (
                        <div className="px-4 pb-4 pt-1 text-xs text-slate-800 leading-relaxed whitespace-pre-line border-t border-slate-100">
                          {msg.body}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="py-2 text-xs text-slate-800 leading-relaxed whitespace-pre-line font-normal">
              {email.body}
            </div>
          )}
        </div>

        {/* AI DRAFT COMPOSER / CTA */}
        {!draft && !draftText && !generatingDraft ? (
          <div className="rounded-xl border border-dashed border-indigo-200 bg-gradient-to-br from-indigo-50/40 via-white to-purple-50/20 p-8 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-xs">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-slate-900">Need to reply to {email.sender_name || email.sender}?</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                MailPilot will compose an authentic, contextual reply matching your learned writing style ({styleProfile?.tone || 'Professional'}, {styleProfile?.formality || 'Moderate'} formality).
              </p>
            </div>
            <div>
              <button
                onClick={() => handleGenerateReply(email.id)}
                className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all active:scale-95 hover:shadow-md cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Generate Draft with AI</span>
              </button>
            </div>
          </div>
        ) : generatingDraft && !draftText ? (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/30 p-10 text-center space-y-3">
            <Sparkles className="w-6 h-6 text-indigo-600 animate-spin mx-auto" />
            <p className="text-xs font-medium text-slate-700">Synthesizing personalized reply from learned style profile...</p>
            <p className="text-[11px] text-slate-400">Analyzing thread context and tone patterns</p>
          </div>
        ) : (
          <div className="rounded-xl border border-indigo-200 bg-white shadow-xs overflow-hidden">
            {/* Header */}
            <div className="px-5 py-3.5 bg-gradient-to-r from-indigo-50/50 to-purple-50/30 border-b border-indigo-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                      AI Draft Composer
                    </h2>
                    {email.status === 'sent' || draft?.status === 'sent' ? (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 text-[10px] font-semibold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Sent</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 text-[10px] font-semibold rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                        <span>Draft</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Context-aware reply matched to your writing style & customized tone.
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleGenerateReply(email.id, toneValue)}
                disabled={generatingDraft || email.status === 'sent' || draft?.status === 'sent'}
                title="Regenerate draft with current tone settings"
                className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-2xs transition-colors active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 text-indigo-600 ${generatingDraft ? 'animate-spin' : ''}`} />
                <span>{generatingDraft ? 'Regenerating...' : `Regenerate (${getToneLabel(toneValue)})`}</span>
              </button>
            </div>

            {/* TONE CUSTOMIZATION SLIDER (Phase 5 Star Feature) */}
            <div className="px-5 py-3.5 bg-gradient-to-r from-slate-50 via-indigo-50/20 to-purple-50/20 border-b border-indigo-100/70 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-700">Tone Slider:</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200/80 shadow-2xs">
                    Level {toneValue}/5 — {getToneLabel(toneValue)}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  {toneValue === 1 && 'Friendly, informal, casual phrasing'}
                  {toneValue === 2 && 'Approachable, modern, clear & conversational'}
                  {toneValue === 3 && 'Balanced professional register (Learned default)'}
                  {toneValue === 4 && 'Polite, structured, elevated business tone'}
                  {toneValue === 5 && 'Strictly formal executive business register'}
                </span>
              </div>

              <div className="flex items-center space-x-3 pt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">1: Casual</span>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={toneValue}
                  onChange={(e) => {
                    const newTone = Number(e.target.value);
                    setToneValue(newTone);
                  }}
                  disabled={generatingDraft || email.status === 'sent' || draft?.status === 'sent'}
                  className="flex-1 accent-indigo-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">5: Formal</span>
              </div>
            </div>

            {/* Style Match Verification Indicator */}
            <div className="px-5 py-2.5 bg-[#fafaf9] border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Style Profile
                </span>
                <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                  {getToneLabel(toneValue)} Tone
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200 font-medium">
                  <Check className="w-3 h-3 text-indigo-600" />
                  <span>{styleProfile?.tone || 'Professional'}</span>
                </span>
                <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200 font-medium">
                  <Check className="w-3 h-3 text-indigo-600" />
                  <span>{styleProfile?.sentence_length || 'Concise'}</span>
                </span>
                <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200 font-medium">
                  <Check className="w-3 h-3 text-indigo-600" />
                  <span>
                    Greeting: {toneValue === 1 ? '“Hey {name},”' : toneValue >= 4 ? '“Dear {name},”' : `“${styleProfile?.greeting || 'Hi'}”`}
                  </span>
                </span>
                <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200 font-medium">
                  <Check className="w-3 h-3 text-indigo-600" />
                  <span>
                    Sign-off: {toneValue === 1 ? '“Best, Sai”' : toneValue === 2 ? '“Thanks, Sai”' : toneValue === 4 ? '“Best regards, Sai”' : toneValue === 5 ? '“Sincerely, Sai”' : `“${styleProfile?.signoff || 'Regards, Sai'}”`}
                  </span>
                </span>
              </div>
            </div>

            {/* Real Email Composer Body */}
            <div className="p-5 space-y-3">
              {/* Recipient meta header */}
              <div className="flex items-center text-xs text-slate-500 border-b border-slate-100 pb-2">
                <span className="w-14 text-slate-400 font-medium">To:</span>
                <span className="font-medium text-slate-800">{email.sender}</span>
              </div>

              {/* Editable Subject Line */}
              <div className="flex items-center text-xs text-slate-600 border-b border-slate-100 pb-2.5">
                <span className="w-14 text-slate-400 font-medium">Subject:</span>
                <input
                  type="text"
                  value={draftSubject}
                  onChange={(e) => setDraftSubject(e.target.value)}
                  disabled={email.status === 'sent' || draft?.status === 'sent'}
                  placeholder="Re: Subject..."
                  className="flex-1 text-xs font-semibold text-slate-900 bg-transparent border-none focus:outline-none placeholder-slate-400 disabled:opacity-75"
                />
              </div>

              {/* Content editor */}
              <textarea
                rows={7}
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                disabled={email.status === 'sent' || draft?.status === 'sent'}
                placeholder="Draft your reply..."
                className="w-full text-xs text-slate-900 placeholder-slate-400 bg-transparent border-none focus:outline-none leading-relaxed font-sans resize-y disabled:opacity-75"
              ></textarea>
            </div>

            {/* Draft Action Bar */}
            <div className="px-5 py-3 bg-[#fafaf9] border-t border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center space-x-3 text-[11px] text-slate-500">
                <span>{draftText.split(/\s+/).filter(Boolean).length} words</span>
                <span>•</span>
                {isDirty && email.status !== 'sent' && draft?.status !== 'sent' ? (
                  <span className="text-amber-600 font-medium flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                    <span>Unsaved edits</span>
                  </span>
                ) : email.status === 'sent' || draft?.status === 'sent' ? (
                  <span className="text-emerald-700 font-medium flex items-center space-x-1">
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Sent to archive</span>
                  </span>
                ) : (
                  <span className="text-slate-400">Saved to drafts</span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {isDirty && email.status !== 'sent' && draft?.status !== 'sent' && (
                  <button
                    onClick={handleDiscardEdits}
                    className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 shadow-2xs transition-colors active:scale-95"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                    <span>Discard</span>
                  </button>
                )}

                <button
                  onClick={handleSaveDraft}
                  disabled={savingDraft || !draftText.trim() || email.status === 'sent' || draft?.status === 'sent'}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-2xs transition-colors active:scale-95 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5 text-slate-500" />
                  <span>{savingDraft ? 'Saving...' : 'Save Draft'}</span>
                </button>

                {email.status === 'sent' || draft?.status === 'sent' ? (
                  <button
                    disabled
                    className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 cursor-not-allowed shadow-2xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Sent</span>
                  </button>
                ) : (
                  <button
                    onClick={handleApproveAndSend}
                    disabled={sendingReply || !draftText.trim()}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-2xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <Send className={`w-3.5 h-3.5 ${sendingReply ? 'animate-pulse' : ''}`} />
                    <span>{sendingReply ? 'Sending...' : '✓ Approve & Send'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal upon Approve & Send */}
      {showConfirmation && sentResult && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Reply Sent Successfully</h3>
                <p className="text-xs text-slate-500">Logged to simulated outgoing sent archive.</p>
              </div>
            </div>

            <div className="bg-[#fafaf9] rounded-lg p-3 border border-slate-200/80 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">To:</span>
                <span className="text-slate-900 font-medium">{sentResult.recipient}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <span className="text-emerald-700 font-medium flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>Sent</span>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Timestamp:</span>
                <span className="text-slate-700">{formatTimestamp(sentResult.sent_at)}</span>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                onClick={() => {
                  setShowConfirmation(false);
                  navigate('/sent');
                }}
                className="flex-1 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-medium transition-colors shadow-2xs"
              >
                View in Sent
              </button>
              <button
                onClick={() => {
                  setShowConfirmation(false);
                  navigate('/inbox');
                }}
                className="py-1.5 px-3 bg-white hover:bg-slate-50 text-slate-700 rounded-md text-xs font-medium border border-slate-200 transition-colors shadow-2xs"
              >
                Back to Inbox
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
