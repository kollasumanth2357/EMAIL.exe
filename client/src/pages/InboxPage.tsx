import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Email, Stats, Priority, Topic } from '../types';
import { PriorityBadge, TopicBadge, AvatarBadge, PriorityDot, SourceBadge, isRealGmailEmail, formatTimestamp } from '../components/Badges';
import { SkeletonInbox, EmptyState } from '../components/UIComponents';
import { analyzeEmails, bulkTriageEmails, bulkUpdateEmails } from '../api';
import {
  RefreshCw,
  UploadCloud,
  ArrowUpDown,
  ChevronDown,
  Sparkles,
  Check,
  Mail,
  MessageSquare
} from 'lucide-react';

interface InboxPageProps {
  emails: Email[];
  stats: Stats | null;
  loading: boolean;
  onRefresh: () => void;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const InboxPage: React.FC<InboxPageProps> = ({
  emails,
  stats,
  loading,
  onRefresh,
  activeFilter,
  onFilterChange,
  searchQuery,
  onSearchChange
}) => {
  const navigate = useNavigate();

  // Local toolbar state for Source, Topic and Sorting
  const [selectedSource, setSelectedSource] = useState<'All' | 'Gmail' | 'Demo'>('All');
  const [selectedTopic, setSelectedTopic] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'newest' | 'priority'>('newest');
  const [isTopicDropdownOpen, setIsTopicDropdownOpen] = useState(false);

  // AI Triage loading & notification state
  const [isTriaging, setIsTriaging] = useState(false);
  const [triageNotification, setTriageNotification] = useState<string | null>(null);

  // Bulk Selection state
  const [selectedEmailIds, setSelectedEmailIds] = useState<string[]>([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  const toggleSelectEmail = (id: string) => {
    setSelectedEmailIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllVisible = () => {
    if (selectedEmailIds.length === displayedEmails.length && displayedEmails.length > 0) {
      setSelectedEmailIds([]);
    } else {
      setSelectedEmailIds(displayedEmails.map((e) => e.id));
    }
  };

  const handleBulkAI = async () => {
    if (selectedEmailIds.length === 0) return;
    try {
      setIsBulkProcessing(true);
      setTriageNotification(`Running AI triage on ${selectedEmailIds.length} selected emails...`);
      const res = await bulkTriageEmails(selectedEmailIds);
      setTriageNotification(
        res.message || `Bulk triage complete: ${res.processed} emails processed.`
      );
      setSelectedEmailIds([]);
      onRefresh();
      setTimeout(() => setTriageNotification(null), 6000);
    } catch (err: any) {
      console.error('Bulk AI triage error:', err);
      setTriageNotification('Bulk triage error: ' + (err.message || 'Unknown error'));
      setTimeout(() => setTriageNotification(null), 6000);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkMarkRead = async (isRead: boolean) => {
    if (selectedEmailIds.length === 0) return;
    try {
      setIsBulkProcessing(true);
      await bulkUpdateEmails(selectedEmailIds, { is_read: isRead });
      setTriageNotification(`Marked ${selectedEmailIds.length} emails as ${isRead ? 'read' : 'unread'}.`);
      setSelectedEmailIds([]);
      onRefresh();
      setTimeout(() => setTriageNotification(null), 4000);
    } catch (err: any) {
      console.error('Bulk update error:', err);
      setTriageNotification('Bulk update error: ' + (err.message || 'Unknown error'));
      setTimeout(() => setTriageNotification(null), 4000);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBatchTriage = async () => {
    try {
      setIsTriaging(true);
      setTriageNotification('Analyzing emails with AI triage engine...');
      const res = await analyzeEmails();
      setTriageNotification(
        `AI Triage complete: ${res.processed} emails analyzed (${res.successful} AI, ${res.fallback} fallback).`
      );
      onRefresh();
      setTimeout(() => {
        setTriageNotification(null);
      }, 6000);
    } catch (err: any) {
      console.error('Batch triage failed:', err);
      setTriageNotification('Failed to run AI triage: ' + (err.message || 'Unknown error'));
      setTimeout(() => {
        setTriageNotification(null);
      }, 6000);
    } finally {
      setIsTriaging(false);
    }
  };

  // Counts by source (Gmail vs Demo)
  const gmailCount = useMemo(() => emails.filter((e) => isRealGmailEmail(e)).length, [emails]);
  const demoCount = useMemo(() => emails.filter((e) => !isRealGmailEmail(e)).length, [emails]);

  // Client-side source, topic & sort filter
  const displayedEmails = useMemo(() => {
    let list = [...emails];

    // Source filter (All | Gmail | Demo)
    if (selectedSource === 'Gmail') {
      list = list.filter((e) => isRealGmailEmail(e));
    } else if (selectedSource === 'Demo') {
      list = list.filter((e) => !isRealGmailEmail(e));
    }

    // Topic filter if selected
    if (selectedTopic !== 'All') {
      list = list.filter((e) => e.topic === selectedTopic);
    }

    // Sort order
    if (sortBy === 'priority') {
      const priorityWeight: Record<Priority, number> = {
        Urgent: 3,
        Normal: 2,
        Low: 1
      };
      list.sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]);
    } else {
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }

    return list;
  }, [emails, selectedSource, selectedTopic, sortBy]);

  const filterTabs = [
    { key: 'All', label: 'All', count: stats?.total || emails.length },
    { key: 'Urgent', label: 'Urgent', count: stats?.urgent || 0 },
    { key: 'Action Required', label: 'Action Required', count: stats?.actionRequired || 0 },
    { key: 'Normal', label: 'Normal', count: stats?.normal || 0 },
    { key: 'Low', label: 'Low', count: stats?.low || 0 }
  ];

  const topicsList = ['All', 'Work', 'Personal', 'Newsletter', 'Action Required', 'Other'];

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white font-sans overflow-hidden">
      {/* Inbox Header without Stats Bar */}
      <div className="px-6 pt-5 pb-4 border-b border-slate-200/80 bg-[#fafaf9]/60 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Inbox</h1>
            <p className="text-xs text-slate-500 mt-0.5">AI-prioritized workspace</p>
          </div>

          {/* Action buttons: AI Triage, Refresh, Import (Filter button removed as requested) */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleBatchTriage}
              disabled={isTriaging}
              title="Run Groq AI Triage on Inbox"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-2xs transition-all active:scale-95 disabled:opacity-60"
            >
              <Sparkles className={`w-3.5 h-3.5 text-indigo-200 ${isTriaging ? 'animate-spin' : ''}`} />
              <span>{isTriaging ? 'Analyzing emails...' : 'AI Triage'}</span>
            </button>

            <button
              onClick={onRefresh}
              title="Refresh inbox"
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-2xs transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => navigate('/import')}
              className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-2xs transition-colors"
            >
              <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
              <span>Import</span>
            </button>
          </div>
        </div>

        {/* AI Triage Feedback Notification Banner */}
        {triageNotification && (
          <div className="mt-3.5 px-3.5 py-2 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs flex items-center justify-between animate-in fade-in">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="font-medium">{triageNotification}</span>
            </div>
            <button
              onClick={() => setTriageNotification(null)}
              className="text-indigo-400 hover:text-indigo-700 font-bold ml-2"
            >
              &times;
            </button>
          </div>
        )}
      </div>

      {/* Inbox Category / Filter Toolbar (Font size increased for enhanced readability) */}
      <div className="px-6 py-2.5 border-b border-slate-200/80 bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Left: Select All & Font-Enhanced Filter Tabs */}
        <div className="flex items-center space-x-2 overflow-x-auto">
          {/* Select all checkbox button */}
          <button
            onClick={handleSelectAllVisible}
            title={selectedEmailIds.length === displayedEmails.length && displayedEmails.length > 0 ? 'Deselect all' : 'Select all visible'}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-[13px] text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <div
              className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                selectedEmailIds.length > 0 && selectedEmailIds.length === displayedEmails.length
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : selectedEmailIds.length > 0
                  ? 'bg-indigo-100 border-indigo-400 text-indigo-700'
                  : 'border-slate-300 bg-white'
              }`}
            >
              {selectedEmailIds.length === displayedEmails.length && displayedEmails.length > 0 ? (
                <Check className="w-3 h-3 text-white stroke-[3]" />
              ) : selectedEmailIds.length > 0 ? (
                <span className="text-[10px] font-bold leading-none">-</span>
              ) : null}
            </div>
            <span className="text-xs font-medium">
              {selectedEmailIds.length > 0 ? `${selectedEmailIds.length} sel` : 'All'}
            </span>
          </button>

          <div className="h-4 w-px bg-slate-200"></div>

          {filterTabs.map((tab) => {
            const isSelected = activeFilter.toLowerCase() === tab.key.toLowerCase();
            return (
              <button
                key={tab.key}
                onClick={() => onFilterChange(tab.key)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-normal ${
                    isSelected ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right toolbar items: Source filter, Topic filter & Sort control */}
        <div className="flex items-center space-x-2">
          {/* Source filter pills: All | Gmail | Demo (Font-Enhanced) */}
          <div className="flex items-center rounded-md border border-slate-200/80 overflow-hidden text-xs font-medium shadow-2xs">
            {(['All', 'Gmail', 'Demo'] as const).map((src) => {
              const count = src === 'Gmail' ? gmailCount : src === 'Demo' ? demoCount : emails.length;
              const isActive = selectedSource === src;
              return (
                <button
                  key={src}
                  onClick={() => setSelectedSource(src)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 transition-colors border-r last:border-r-0 border-slate-200/80 ${
                    isActive
                      ? src === 'Gmail'
                        ? 'bg-red-50 text-red-700 font-semibold'
                        : 'bg-slate-900 text-white font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 bg-white'
                  }`}
                >
                  <span>{src}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] leading-none ${
                      isActive
                        ? src === 'Gmail'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-slate-700 text-slate-200'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="h-4 w-px bg-slate-200" />

          {/* Topic filter pill */}
          <div className="relative">
            <button
              onClick={() => setIsTopicDropdownOpen(!isTopicDropdownOpen)}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:bg-slate-50 transition-colors"
            >
              <span className="text-slate-400">Topic:</span>
              <span className="font-medium text-slate-800">{selectedTopic}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isTopicDropdownOpen && (
              <div className="absolute right-0 mt-1 w-40 bg-white border border-slate-200 rounded-md shadow-lg py-1 z-30 animate-in fade-in">
                {topicsList.map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setSelectedTopic(t);
                      setIsTopicDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-50 ${
                      selectedTopic === t ? 'text-indigo-600 font-medium' : 'text-slate-700'
                    }`}
                  >
                    <span>{t}</span>
                    {selectedTopic === t && <span className="text-indigo-600">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sort control */}
          <button
            onClick={() => setSortBy(sortBy === 'newest' ? 'priority' : 'newest')}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:bg-slate-50 transition-colors"
            title={`Sorting by: ${sortBy === 'newest' ? 'Newest' : 'Priority'}`}
          >
            <ArrowUpDown className="w-3 h-3 text-slate-400" />
            <span className="text-slate-400">Sort:</span>
            <span className="font-medium text-slate-800 capitalize">{sortBy}</span>
          </button>
        </div>
      </div>

      {/* Floating / Sticky Bulk Actions Bar */}
      {selectedEmailIds.length > 0 && (
        <div className="px-6 py-2 bg-indigo-50/90 border-b border-indigo-200/80 flex items-center justify-between text-xs animate-in fade-in slide-in-from-top-1 shrink-0">
          <div className="flex items-center space-x-3">
            <span className="font-semibold text-indigo-950">
              {selectedEmailIds.length} {selectedEmailIds.length === 1 ? 'email' : 'emails'} selected
            </span>
            <div className="h-3 w-px bg-indigo-200"></div>
            <button
              onClick={() => setSelectedEmailIds([])}
              className="text-indigo-600 hover:text-indigo-900 font-medium hover:underline"
            >
              Clear selection
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleBulkAI}
              disabled={isBulkProcessing}
              title="Run Groq AI Triage on selected emails"
              className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-2xs transition-colors disabled:opacity-60"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isBulkProcessing ? 'animate-spin' : ''}`} />
              <span>{isBulkProcessing ? 'Triaging...' : `AI Triage (${selectedEmailIds.length})`}</span>
            </button>

            <button
              onClick={() => handleBulkMarkRead(true)}
              disabled={isBulkProcessing}
              title="Mark selected emails as read"
              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium shadow-2xs transition-colors disabled:opacity-60"
            >
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Mark Read</span>
            </button>

            <button
              onClick={() => handleBulkMarkRead(false)}
              disabled={isBulkProcessing}
              title="Mark selected emails as unread"
              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium shadow-2xs transition-colors disabled:opacity-60"
            >
              <Mail className="w-3.5 h-3.5 text-slate-500" />
              <span>Mark Unread</span>
            </button>
          </div>
        </div>
      )}

      {/* Email List View with Entire Row Hover Highlight */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 bg-white">
        {loading ? (
          <SkeletonInbox />
        ) : displayedEmails.length === 0 ? (
          <EmptyState
            title="Your inbox is clear"
            description="No emails match the selected filters or search query."
            actionText="Reset filters"
            onAction={() => {
              onFilterChange('All');
              setSelectedTopic('All');
              onSearchChange('');
            }}
          />
        ) : (
          displayedEmails.map((email) => {
            const isUnread = !email.is_read;

            return (
              <div
                key={email.id}
                onClick={() => navigate(`/email/${email.id}`)}
                className={`group px-6 py-3.5 flex items-start space-x-3.5 cursor-pointer transition-all duration-150 relative hover:bg-slate-50/90 hover:shadow-2xs ${
                  isUnread ? 'bg-[#fcfcfa]' : 'bg-white'
                }`}
              >
                {/* Subtle Unread Indicator Bar */}
                {isUnread && (
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-indigo-600"></div>
                )}

                {/* Row Selection Checkbox */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelectEmail(email.id);
                  }}
                  className="pt-1.5 shrink-0 pr-0.5 cursor-pointer"
                  title={selectedEmailIds.includes(email.id) ? 'Deselect email' : 'Select email'}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${
                      selectedEmailIds.includes(email.id)
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-slate-300 bg-white hover:border-slate-400 group-hover:border-slate-400'
                    }`}
                  >
                    {selectedEmailIds.includes(email.id) && (
                      <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                    )}
                  </div>
                </div>

                {/* Priority Dot Indicator */}
                <div className="pt-1.5 shrink-0">
                  <PriorityDot priority={email.priority} />
                </div>

                {/* Sender Avatar */}
                <div className="shrink-0 pt-0.5">
                  <AvatarBadge name={email.sender_name} email={email.sender} size="sm" />
                </div>

                {/* Main Row Content */}
                <div className="flex-1 min-w-0">
                  {/* Line 1: Sender, Badges, Thread Count & Timestamp */}
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="flex items-center space-x-2 truncate">
                      <span
                        className={`text-xs truncate ${
                          isUnread ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'
                        }`}
                      >
                        {email.sender_name}
                      </span>

                      {/* Priority Badge */}
                      <PriorityBadge priority={email.priority} size="sm" />

                      {/* Topic Badge */}
                      <TopicBadge topic={email.topic} size="sm" />

                      {/* Source Badge: Gmail vs Demo */}
                      <SourceBadge source={isRealGmailEmail(email) ? 'gmail' : 'demo'} size="xs" />

                      {/* Thread count badge if multiple messages */}
                      {email.messages && email.messages.length > 1 && (
                        <span
                          className="inline-flex items-center space-x-1 px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200 shrink-0"
                          title={`${email.messages.length} messages in conversation thread`}
                        >
                          <MessageSquare className="w-2.5 h-2.5 text-slate-400" />
                          <span>{email.messages.length}</span>
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] text-slate-400 font-normal shrink-0">
                      {formatTimestamp(email.timestamp)}
                    </span>
                  </div>

                  {/* Line 2: Subject */}
                  <div className="mt-0.5">
                    <span
                      className={`text-xs tracking-tight ${
                        isUnread ? 'font-medium text-slate-900' : 'text-slate-700'
                      }`}
                    >
                      {email.subject}
                    </span>
                  </div>

                  {/* Line 3: 2-Line AI Summary */}
                  <p className="text-[12px] text-slate-500 line-clamp-2 mt-1 leading-relaxed font-normal">
                    {email.summary || email.body.slice(0, 160)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
