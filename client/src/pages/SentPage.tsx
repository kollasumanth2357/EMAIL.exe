import React, { useState, useEffect } from 'react';
import { SentEmail } from '../types';
import { fetchSentEmails } from '../api';
import { Send, Check, Search } from 'lucide-react';
import { formatTimestamp } from '../components/Badges';
import { EmptyState } from '../components/UIComponents';

export const SentPage: React.FC = () => {
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSent, setSelectedSent] = useState<SentEmail | null>(null);

  useEffect(() => {
    loadSent();
  }, []);

  const loadSent = async () => {
    try {
      setLoading(true);
      const data = await fetchSentEmails();
      setSentEmails(data);
      if (data.length > 0) {
        setSelectedSent(data[0]);
      }
    } catch (err) {
      console.error('Failed to load sent emails:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = sentEmails.filter(
    (s) =>
      s.recipient.toLowerCase().includes(search.toLowerCase()) ||
      s.subject.toLowerCase().includes(search.toLowerCase()) ||
      s.body.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-white font-sans">
      {/* Fixed Sent Header */}
      <div className="px-8 pt-6 pb-4 border-b border-slate-200/80 bg-[#fafaf9]/60 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Sent</h1>
              <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {sentEmails.length} Outgoing Messages
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Audit log of approved and simulated outgoing replies.
            </p>
          </div>

          {/* Search Input with proper padding to prevent icon overlap */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search sent emails..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-md pl-10 pr-4 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Two-Panel Layout Container */}
      <div className="flex-1 flex min-h-0 overflow-hidden p-6 gap-6 max-w-7xl mx-auto w-full">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-2">
            <div className="inline-block w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-500">Loading sent archive...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState
              title="No sent replies yet"
              description="When you approve and send AI-drafted replies, they will appear in this audit log."
              icon={<Send className="w-6 h-6 text-slate-400" />}
            />
          </div>
        ) : (
          <>
            {/* Left Panel: Sent List with Independent Vertical Scrolling */}
            <div className="w-full sm:w-5/12 lg:w-4/12 h-full flex flex-col min-h-0 border border-slate-200 rounded-xl bg-white shadow-2xs overflow-hidden shrink-0">
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                {filtered.map((item) => {
                  const isSelected = selectedSent?.id === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedSent(item)}
                      className={`p-3.5 cursor-pointer transition-all duration-150 relative ${
                        isSelected
                          ? 'bg-indigo-50/50 border-l-3 border-indigo-600'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-1.5 truncate">
                          <span className="inline-flex items-center space-x-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/60">
                            <Check className="w-2.5 h-2.5" />
                            <span>Sent</span>
                          </span>
                          <span className="text-xs font-semibold text-slate-900 truncate">
                            {item.recipient}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 shrink-0">
                          {formatTimestamp(item.sent_at)}
                        </span>
                      </div>

                      <div className="text-xs text-slate-800 font-medium truncate mb-1">
                        {item.subject}
                      </div>
                      <div className="text-xs text-slate-500 line-clamp-2 leading-relaxed font-normal">
                        {item.body}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Panel: Detail Reader Fixed/Sticky within viewport */}
            <div className="hidden sm:flex flex-1 h-full min-h-0 flex-col border border-slate-200 rounded-xl p-6 bg-[#fafaf9]/60 shadow-2xs overflow-y-auto space-y-4">
              {selectedSent ? (
                <>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 shrink-0">
                    <div>
                      <span className="text-xs text-slate-400">To: </span>
                      <span className="text-xs font-semibold text-slate-900">{selectedSent.recipient}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="inline-flex items-center space-x-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <Check className="w-3 h-3" />
                        <span>Sent</span>
                      </span>
                      <span className="text-slate-400">{formatTimestamp(selectedSent.sent_at)}</span>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <h3 className="text-sm font-semibold text-slate-900">{selectedSent.subject}</h3>
                  </div>

                  <div className="flex-1 bg-white p-5 rounded-lg border border-slate-200/80 text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-line shadow-2xs">
                    {selectedSent.body}
                  </div>
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                  Select an email to view sent details.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
