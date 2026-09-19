import React, { useState, useEffect } from 'react';
import { DetailedAnalytics, Stats, Email } from '../types';
import { fetchAnalytics, fetchEmails } from '../api';
import {
  Clock,
  Inbox,
  CheckSquare,
  Send,
  FileText,
  Sparkles,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Layers,
  Activity
} from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<DetailedAnalytics | null>(null);
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [res, ems] = await Promise.all([fetchAnalytics(), fetchEmails()]);
      setAnalytics(res.analytics);
      setEmails(ems);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const total = analytics?.total || emails.length || 0;
  const triaged = analytics?.triagedCount || emails.filter((e) => e.summary && e.summary.trim()).length || 0;
  const triagePct = analytics?.triageProgress?.percentage ?? (total > 0 ? Math.round((triaged / total) * 100) : 0);

  const topicColors: Record<string, { bar: string; text: string; bg: string }> = {
    Work: { bar: 'bg-indigo-600', text: 'text-indigo-700', bg: 'bg-indigo-50' },
    'Action Required': { bar: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
    Personal: { bar: 'bg-purple-500', text: 'text-purple-700', bg: 'bg-purple-50' },
    Newsletter: { bar: 'bg-teal-500', text: 'text-teal-700', bg: 'bg-teal-50' },
    Other: { bar: 'bg-slate-400', text: 'text-slate-600', bg: 'bg-slate-50' }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto bg-white font-sans">
      {/* Header */}
      <div className="px-8 pt-7 pb-5 border-b border-slate-200/80 bg-[#fafaf9]/60 shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Analytics</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time productivity impact and mailbox intelligence from Supabase PostgreSQL.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-2xs transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="p-8 max-w-5xl mx-auto w-full space-y-8">
        {/* Core KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Estimated Time Saved */}
          <div className="p-4 rounded-xl border border-slate-200 bg-[#fafaf9]/80 space-y-1 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-500">Estimated time saved</span>
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <div className="text-2xl font-semibold text-slate-900">
              {analytics?.estimatedMinutesSaved || 0}{' '}
              <span className="text-xs font-normal text-slate-500">min</span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center space-x-1 pt-0.5">
              <TrendingUp className="w-3 h-3 text-emerald-500" />
              <span>Based on AI triage & replies</span>
            </div>
          </div>

          {/* AI Triage Rate */}
          <div className="p-4 rounded-xl border border-slate-200 bg-[#fafaf9]/80 space-y-1 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-500">AI Triage completion</span>
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <div className="text-2xl font-semibold text-slate-900">
              {triagePct}%
            </div>
            <div className="text-[11px] text-slate-500">
              {triaged} of {total} emails classified
            </div>
          </div>

          {/* Total Inbox */}
          <div className="p-4 rounded-xl border border-slate-200 bg-[#fafaf9]/80 space-y-1 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-500">Inbox volume</span>
              <Inbox className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-2xl font-semibold text-slate-900">
              {total}
            </div>
            <div className="text-[11px] text-slate-500">
              {analytics?.unreadCount ?? 0} unread messages
            </div>
          </div>

          {/* Sent Replies */}
          <div className="p-4 rounded-xl border border-slate-200 bg-[#fafaf9]/80 space-y-1 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-500">Approved & sent</span>
              <Send className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-2xl font-semibold text-slate-900">
              {analytics?.sentCount || 0}
            </div>
            <div className="text-[11px] text-slate-500">
              {analytics?.draftsCount || 0} pending drafts
            </div>
          </div>
        </div>

        {/* Visual Charts Grid: Topics & Priorities */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Topic Distribution Chart */}
          <div className="p-6 rounded-xl border border-slate-200 bg-white space-y-4 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                  Topic Breakdown
                </h2>
              </div>
              <span className="text-xs text-slate-400 font-normal">{total} total emails</span>
            </div>

            <div className="space-y-3 pt-1">
              {analytics?.topicDistribution ? (
                Object.entries(analytics.topicDistribution).map(([rawTopic, data]) => {
                  const labelMap: Record<string, string> = {
                    work: 'Work',
                    personal: 'Personal',
                    newsletter: 'Newsletter',
                    actionRequired: 'Action Required',
                    other: 'Other'
                  };
                  const topicLabel = labelMap[rawTopic] || rawTopic;
                  const colors = topicColors[topicLabel] || { bar: 'bg-slate-400', text: 'text-slate-600', bg: 'bg-slate-50' };

                  return (
                    <div key={rawTopic} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-700">{topicLabel}</span>
                        <span className="text-slate-500 font-normal">
                          {data.count} ({data.percentage}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${colors.bar} transition-all duration-500`}
                          style={{ width: `${Math.min(100, Math.max(2, data.percentage))}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-xs text-slate-400">Loading topic metrics...</div>
              )}
            </div>
          </div>

          {/* Priority & Mailbox Composition */}
          <div className="p-6 rounded-xl border border-slate-200 bg-white space-y-4 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                  Priority Distribution
                </h2>
              </div>
              <span className="text-xs text-slate-400 font-normal">Triage urgency</span>
            </div>

            <div className="space-y-4 pt-1">
              {/* Urgent */}
              <div className="p-3 rounded-lg bg-red-50/70 border border-red-100 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    <span className="text-xs font-semibold text-red-900">Urgent</span>
                  </div>
                  <p className="text-[11px] text-red-700">Immediate reply required</p>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold text-red-900">{analytics?.urgent || 0}</div>
                  <div className="text-[10px] text-red-600">{analytics?.priorityDistribution?.urgent?.percentage || 0}%</div>
                </div>
              </div>

              {/* Normal */}
              <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-100 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    <span className="text-xs font-semibold text-blue-900">Normal</span>
                  </div>
                  <p className="text-[11px] text-blue-700">Standard business turnaround</p>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold text-blue-900">{analytics?.normal || 0}</div>
                  <div className="text-[10px] text-blue-600">{analytics?.priorityDistribution?.normal?.percentage || 0}%</div>
                </div>
              </div>

              {/* Low */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                    <span className="text-xs font-semibold text-slate-800">Low</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Informational / reading material</p>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold text-slate-800">{analytics?.low || 0}</div>
                  <div className="text-[10px] text-slate-500">{analytics?.priorityDistribution?.low?.percentage || 0}%</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mailbox Lifecycle & Workflow Health */}
        <div className="p-6 rounded-xl border border-slate-200 bg-white space-y-4 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                Mailbox Lifecycle
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-normal">End-to-End Workflow</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-lg border border-slate-100 bg-[#fafaf9]">
              <div className="text-slate-500 font-medium">1. Ingested & Stored</div>
              <div className="text-lg font-semibold text-slate-900 mt-1">{total} emails</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Stored in Supabase PostgreSQL</p>
            </div>

            <div className="p-3.5 rounded-lg border border-slate-100 bg-[#fafaf9]">
              <div className="text-slate-500 font-medium">2. Groq AI Triaged</div>
              <div className="text-lg font-semibold text-indigo-900 mt-1">{triaged} classified ({triagePct}%)</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Priority & 2-line summaries</p>
            </div>

            <div className="p-3.5 rounded-lg border border-slate-100 bg-[#fafaf9]">
              <div className="text-slate-500 font-medium">3. Personalized Replies</div>
              <div className="text-lg font-semibold text-emerald-900 mt-1">
                {analytics?.sentCount || 0} sent / {analytics?.draftsCount || 0} drafts
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Calibrated to learned user tone</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

