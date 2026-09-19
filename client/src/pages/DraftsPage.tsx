import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Draft } from '../types';
import { fetchDrafts } from '../api';
import { FileText, ArrowRight, Clock, Sparkles, Check } from 'lucide-react';
import { formatTimestamp, PriorityBadge, TopicBadge } from '../components/Badges';
import { EmptyState } from '../components/UIComponents';

export const DraftsPage: React.FC = () => {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadDrafts();
  }, []);

  const loadDrafts = async () => {
    try {
      setLoading(true);
      const data = await fetchDrafts();
      setDrafts(data);
    } catch (err) {
      console.error('Failed to load drafts:', err);
    } finally {
      setLoading(false);
    }
  };

  const getToneLabel = (val?: number): string => {
    switch (val) {
      case 1: return 'More Casual';
      case 2: return 'Slightly Casual';
      case 3: return 'Balanced';
      case 4: return 'More Formal';
      case 5: return 'Highly Formal';
      default: return 'Balanced';
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto bg-white font-sans">
      {/* Header */}
      <div className="px-8 pt-7 pb-5 border-b border-slate-200/80 bg-[#fafaf9]/60 shrink-0">
        <div className="flex items-center space-x-2">
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Drafts</h1>
          <span className="text-[11px] font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
            {drafts.length} Pending Replies
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Review, customize tone, edit, and approve drafts awaiting dispatch.
        </p>
      </div>

      <div className="p-8 max-w-4xl mx-auto w-full">
        {loading ? (
          <div className="p-12 text-center space-y-2">
            <div className="inline-block w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-500">Loading drafts...</p>
          </div>
        ) : drafts.length === 0 ? (
          <EmptyState
            title="No drafts yet"
            description="Open any email in your inbox to generate or edit a personalized reply draft."
            actionText="Go to Inbox"
            onAction={() => navigate('/inbox')}
            icon={<FileText className="w-6 h-6 text-slate-400" />}
          />
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white overflow-hidden shadow-2xs">
            {drafts.map((draft) => (
              <div
                key={draft.id}
                onClick={() => navigate(`/email/${draft.email_id}`)}
                className="p-5 hover:bg-slate-50/80 cursor-pointer transition-colors flex items-start justify-between gap-4 group"
              >
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/60">
                      Draft
                    </span>

                    {draft.email_priority && (
                      <PriorityBadge priority={draft.email_priority} size="sm" />
                    )}

                    {draft.email_topic && (
                      <TopicBadge topic={draft.email_topic} size="sm" />
                    )}

                    <span className="text-slate-300">·</span>
                    <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>Last edited {formatTimestamp(draft.updated_at)}</span>
                    </span>
                  </div>

                  <div className="text-xs font-semibold text-slate-900 tracking-tight">
                    {draft.subject || draft.email_subject || `Email #${draft.email_id}`}
                  </div>

                  <div className="text-xs text-slate-600 line-clamp-2 leading-relaxed whitespace-pre-line font-normal">
                    {draft.content}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                      Tone Setting:
                    </span>
                    <span className="inline-flex items-center space-x-1 text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      <span>Level {draft.tone_value || 3}/5 — {getToneLabel(draft.tone_value || 3)}</span>
                    </span>
                  </div>
                </div>

                <div className="self-center shrink-0">
                  <button className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-white border border-slate-200 text-xs font-medium text-slate-700 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-colors shadow-2xs cursor-pointer">
                    <span>Edit & Send</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
