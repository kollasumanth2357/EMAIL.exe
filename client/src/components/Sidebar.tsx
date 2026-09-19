import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Inbox,
  AlertCircle,
  CheckSquare,
  FileText,
  Send,
  Sparkles,
  BarChart2,
  Settings,
  HelpCircle,
  LogOut,
  X
} from 'lucide-react';
import { Stats, GmailStatus } from '../types';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  stats?: Stats | null;
  gmailStatus?: GmailStatus | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ stats, gmailStatus }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showHelpModal, setShowHelpModal] = useState(false);

  const isInboxActive = location.pathname === '/inbox' && !location.search;
  const isUrgentActive = location.pathname === '/inbox' && location.search.includes('priority=Urgent');
  const isActionActive = location.pathname === '/inbox' && location.search.includes('topic=Action Required');

  const isGmailActive = !user?.isDemo && gmailStatus?.connected && gmailStatus?.mode === 'real' && gmailStatus?.accountEmail;
  const displayName = isGmailActive
    ? gmailStatus.accountEmail.split('@')[0]
    : user?.name || 'Sai';
  const displayEmail = isGmailActive
    ? gmailStatus.accountEmail
    : user?.email || 'sai@mailpilot.demo';
  const initial = displayName.charAt(0).toUpperCase() || 'S';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-[240px] bg-[#fafaf9] border-r border-slate-200/90 flex flex-col h-screen select-none shrink-0 font-sans">
      {/* Top Header / Logo */}
      <div className="h-14 px-4 border-b border-slate-200/80 flex items-center justify-between">
        <NavLink to="/" className="flex items-center space-x-2.5 group">
          <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm tracking-tight text-slate-900 leading-tight">
              MailPilot
            </span>
            <span className="text-[11px] text-slate-500 font-normal leading-tight">
              AI Email Assistant
            </span>
          </div>
        </NavLink>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        {/* Inbox */}
        <NavLink
          to="/inbox"
          end
          className={() =>
            `group flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors relative ${
              isInboxActive
                ? 'bg-slate-200/60 text-slate-900 font-medium'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`
          }
        >
          <div className="flex items-center space-x-2.5">
            {isInboxActive && (
              <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-indigo-600 rounded-r"></span>
            )}
            <Inbox className={`w-4 h-4 transition-colors ${isInboxActive ? 'text-indigo-600' : 'text-slate-500 group-hover:text-slate-700'}`} />
            <span>Inbox</span>
          </div>
          {stats?.total ? (
            <span className="text-[11px] text-slate-500 font-normal">
              {stats.total}
            </span>
          ) : null}
        </NavLink>

        {/* Important */}
        <NavLink
          to="/inbox?priority=Urgent"
          className={() =>
            `group flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors relative ${
              isUrgentActive
                ? 'bg-slate-200/60 text-slate-900 font-medium'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`
          }
        >
          <div className="flex items-center space-x-2.5">
            {isUrgentActive && (
              <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-indigo-600 rounded-r"></span>
            )}
            <AlertCircle className={`w-4 h-4 transition-colors ${isUrgentActive ? 'text-red-600' : 'text-slate-500 group-hover:text-slate-700'}`} />
            <span>Important</span>
          </div>
          {stats?.urgent ? (
            <span className="px-1.5 py-0.2 text-[10px] font-medium bg-red-100 text-red-700 rounded-full">
              {stats.urgent}
            </span>
          ) : null}
        </NavLink>

        {/* Action Required */}
        <NavLink
          to="/inbox?topic=Action Required"
          className={() =>
            `group flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors relative ${
              isActionActive
                ? 'bg-slate-200/60 text-slate-900 font-medium'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`
          }
        >
          <div className="flex items-center space-x-2.5">
            {isActionActive && (
              <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-indigo-600 rounded-r"></span>
            )}
            <CheckSquare className={`w-4 h-4 transition-colors ${isActionActive ? 'text-amber-600' : 'text-slate-500 group-hover:text-slate-700'}`} />
            <span>Action Required</span>
          </div>
          {stats?.actionRequired ? (
            <span className="px-1.5 py-0.2 text-[10px] font-medium bg-amber-100 text-amber-800 rounded-full">
              {stats.actionRequired}
            </span>
          ) : null}
        </NavLink>

        {/* Drafts */}
        <NavLink
          to="/drafts"
          className={({ isActive }) =>
            `group flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors relative ${
              isActive
                ? 'bg-slate-200/60 text-slate-900 font-medium'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className="flex items-center space-x-2.5">
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-indigo-600 rounded-r"></span>
                )}
                <FileText className={`w-4 h-4 transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-500 group-hover:text-slate-700'}`} />
                <span>Drafts</span>
              </div>
              {stats?.draftsCount ? (
                <span className="text-[11px] text-slate-500 font-normal">
                  {stats.draftsCount}
                </span>
              ) : null}
            </>
          )}
        </NavLink>

        {/* Sent */}
        <NavLink
          to="/sent"
          className={({ isActive }) =>
            `group flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors relative ${
              isActive
                ? 'bg-slate-200/60 text-slate-900 font-medium'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className="flex items-center space-x-2.5">
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-indigo-600 rounded-r"></span>
                )}
                <Send className={`w-4 h-4 transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-500 group-hover:text-slate-700'}`} />
                <span>Sent</span>
              </div>
              {stats?.sentCount ? (
                <span className="text-[11px] text-slate-500 font-normal">
                  {stats.sentCount}
                </span>
              ) : null}
            </>
          )}
        </NavLink>

        {/* Divider */}
        <div className="pt-3 pb-2 px-2">
          <div className="border-t border-slate-200/80"></div>
        </div>

        {/* Secondary: AI Style & Analytics */}
        <div className="space-y-1">
          <NavLink
            to="/style"
            className={({ isActive }) =>
              `group flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors relative ${
                isActive
                  ? 'bg-slate-200/60 text-slate-900 font-medium'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="flex items-center space-x-2.5">
                  {isActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-indigo-600 rounded-r"></span>
                  )}
                  <Sparkles className={`w-4 h-4 transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-500 group-hover:text-slate-700'}`} />
                  <span>AI Style</span>
                </div>
                <span className="text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200/60 font-medium">
                  Learned
                </span>
              </>
            )}
          </NavLink>

          <NavLink
            to="/analytics"
            className={({ isActive }) =>
              `group flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors relative ${
                isActive
                  ? 'bg-slate-200/60 text-slate-900 font-medium'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`
            }
          >
            {({ isActive }) => (
              <div className="flex items-center space-x-2.5">
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-indigo-600 rounded-r"></span>
                )}
                <BarChart2 className={`w-4 h-4 transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-500 group-hover:text-slate-700'}`} />
                <span>Analytics</span>
              </div>
            )}
          </NavLink>
        </div>

        {/* Divider */}
        <div className="pt-3 pb-2 px-2">
          <div className="border-t border-slate-200/80"></div>
        </div>

        {/* Settings & Help */}
        <div className="space-y-1">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `group flex items-center px-2.5 py-1.5 rounded-md text-xs transition-colors relative ${
                isActive
                  ? 'bg-slate-200/60 text-slate-900 font-medium'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`
            }
          >
            {({ isActive }) => (
              <div className="flex items-center space-x-2.5">
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-indigo-600 rounded-r"></span>
                )}
                <Settings className={`w-4 h-4 transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-500 group-hover:text-slate-700'}`} />
                <span>Settings</span>
              </div>
            )}
          </NavLink>

          <button
            onClick={() => setShowHelpModal(true)}
            className="w-full text-left group flex items-center px-2.5 py-1.5 rounded-md text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center space-x-2.5">
              <HelpCircle className="w-4 h-4 text-slate-500 group-hover:text-slate-700 transition-colors" />
              <span>Help & Quick Guide</span>
            </div>
          </button>
        </div>
      </div>

      {/* User & Logout Section at Bottom */}
      <div className="p-3 border-t border-slate-200/80 bg-[#f8fafc] flex items-center justify-between">
        <div className="flex items-center space-x-2.5 min-w-0 flex-1">
          <div className={`w-8 h-8 rounded-full text-white flex items-center justify-center text-xs font-semibold shrink-0 shadow-2xs ${
            isGmailActive ? 'bg-red-600' : 'bg-slate-900'
          }`}>
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-slate-900 leading-tight truncate">
              {displayName}
            </div>
            <div className="text-[11px] text-slate-500 truncate leading-tight">
              {displayEmail}
            </div>
            <div className="flex items-center space-x-1 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isGmailActive ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
              <span className="text-[10px] text-slate-500">
                {isGmailActive ? 'Gmail connected' : user?.isDemo ? 'Demo Mode' : 'Account active'}
              </span>
            </div>
          </div>
        </div>

        {/* Functional Logout Button */}
        <button
          onClick={handleLogout}
          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors shrink-0 ml-1.5"
          title="Log out of MailPilot"
          aria-label="Log Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">MailPilot Quick Reference</h3>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <p><strong className="text-slate-900">Inbox:</strong> Browse AI-prioritized emails with strict 2-line summaries and instant priority tags.</p>
              <p><strong className="text-slate-900">Reading & Drafts:</strong> Open any email to see the thread chronology, AI executive insights, and an automated tone-matched draft.</p>
              <p><strong className="text-slate-900">Style Profile:</strong> Inspect the tone calibration learned from sent examples, including greeting and signature match.</p>
              <p><strong className="text-slate-900">Approve & Send:</strong> Dispatches outgoing replies with full human review and logs to your Sent archive.</p>
            </div>
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-1.5 rounded-md bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
