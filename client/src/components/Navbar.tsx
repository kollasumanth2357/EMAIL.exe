import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  HelpCircle,
  X,
  Sparkles,
  Settings,
  Database,
  LogOut,
  ChevronDown,
  User as UserIcon,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { GmailStatus } from '../types';

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onRefresh?: () => void;
  onTriggerTriage?: () => void;
  isAnalyzing?: boolean;
  gmailStatus?: GmailStatus | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  searchQuery,
  onSearchChange,
  gmailStatus
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [notificationOpen, setNotificationOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const helpRef = useRef<HTMLDivElement>(null);

  // Close popovers on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationOpen(false);
      }
      if (helpRef.current && !helpRef.current.contains(event.target as Node)) {
        setHelpOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute display user name and initial
  const isGmailActive = !user?.isDemo && gmailStatus?.connected && gmailStatus?.mode === 'real' && gmailStatus?.accountEmail;
  const displayName = isGmailActive
    ? gmailStatus.accountEmail.split('@')[0]
    : user?.name || 'Sai';
  const displayEmail = isGmailActive
    ? gmailStatus.accountEmail
    : user?.email || 'sai@mailpilot.demo';
  const initial = displayName.charAt(0).toUpperCase() || 'S';

  const handleLogout = () => {
    setProfileDropdownOpen(false);
    logout();
    navigate('/login');
  };

  // Dynamic page title based on current path
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.startsWith('/email/')) return 'Email Conversation';
    if (path === '/inbox') {
      if (location.search.includes('priority=Urgent')) return 'Important';
      if (location.search.includes('topic=Action Required')) return 'Action Required';
      return 'Inbox';
    }
    if (path === '/drafts') return 'Drafts';
    if (path === '/sent') return 'Sent';
    if (path === '/style') return 'Writing Style';
    if (path === '/analytics') return 'Analytics';
    if (path === '/settings') return 'Settings';
    if (path === '/import') return 'Import Inbox';
    return 'MailPilot';
  };

  return (
    <header className="h-12 border-b border-slate-200/90 bg-white/80 backdrop-blur-xs px-6 flex items-center justify-between sticky top-0 z-30 shrink-0 select-none">
      {/* Left: Page Title */}
      <div className="w-48 shrink-0">
        <h1 className="text-sm font-semibold text-slate-900 tracking-tight">
          {getPageTitle()}
        </h1>
      </div>

      {/* Center: Global Search with guaranteed icon & text separation */}
      <div className="flex-1 max-w-lg mx-4">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search emails, senders, subjects..."
            value={searchQuery}
            onChange={(e) => {
              onSearchChange(e.target.value);
              if (location.pathname !== '/inbox') {
                navigate('/inbox');
              }
            }}
            className="w-full bg-[#fafaf9] hover:bg-slate-100/70 focus:bg-white border border-slate-200/80 focus:border-indigo-500 text-xs text-slate-800 placeholder-slate-400 rounded-md pl-10 pr-8 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Right: Sync Status, Notifications, Help, User Avatar & Profile Dropdown */}
      <div className="flex items-center space-x-2 shrink-0">
        {/* Real Gmail 2-Way Sync Status Indicator */}
        {isGmailActive && (
          <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-red-50/80 border border-red-200/60 text-[10px] text-red-700 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
            <span>2-Way Sync Active</span>
          </div>
        )}

        {/* Notification Icon with Popover */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => {
              setNotificationOpen(!notificationOpen);
              setHelpOpen(false);
              setProfileDropdownOpen(false);
            }}
            aria-label="Notifications"
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors relative"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-indigo-600 rounded-full"></span>
          </button>

          {notificationOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-lg shadow-lg p-3 z-50 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                <span className="text-xs font-semibold text-slate-900">AI Intelligence Status</span>
                <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-600 mb-2 leading-relaxed">
                Triage engine evaluated incoming messages and highlighted urgent action items.
              </p>
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-500" />
                <span>Writing style synced from sent examples.</span>
              </div>
            </div>
          )}
        </div>

        {/* Help Icon */}
        <div className="relative" ref={helpRef}>
          <button
            onClick={() => {
              setHelpOpen(!helpOpen);
              setNotificationOpen(false);
              setProfileDropdownOpen(false);
            }}
            aria-label="Help"
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {helpOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-lg shadow-lg p-3 z-50 animate-in fade-in">
              <div className="text-xs font-semibold text-slate-900 mb-1">Keyboard & Shortcuts</div>
              <div className="text-xs text-slate-600 space-y-1.5">
                <div className="flex justify-between">
                  <span>Search</span>
                  <kbd className="px-1.5 py-0.5 text-[10px] bg-slate-100 border border-slate-200 rounded text-slate-500">/</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Clear Search</span>
                  <kbd className="px-1.5 py-0.5 text-[10px] bg-slate-100 border border-slate-200 rounded text-slate-500">Esc</kbd>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="h-3.5 w-px bg-slate-200 mx-1"></div>

        {/* Dynamic User Avatar & Account / Profile Dropdown Menu */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => {
              setProfileDropdownOpen(!profileDropdownOpen);
              setNotificationOpen(false);
              setHelpOpen(false);
            }}
            className="flex items-center space-x-1.5 p-0.5 rounded-full hover:ring-2 hover:ring-indigo-100 transition-all focus:outline-none"
            title={`${displayName} (${displayEmail})`}
          >
            <div className={`w-7 h-7 rounded-full text-white flex items-center justify-center text-xs font-semibold shadow-2xs ${
              isGmailActive ? 'bg-red-600' : 'bg-slate-900'
            }`}>
              {initial}
            </div>
          </button>

          {profileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-60 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in slide-in-from-top-1 divide-y divide-slate-100">
              {/* User Identity Info */}
              <div className="px-3.5 py-2.5">
                <div className="flex items-center space-x-2.5">
                  <div className={`w-8 h-8 rounded-full text-white flex items-center justify-center text-xs font-semibold shrink-0 ${
                    isGmailActive ? 'bg-red-600' : 'bg-slate-900'
                  }`}>
                    {initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-900 truncate">
                      {displayName}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {displayEmail}
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex items-center space-x-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isGmailActive ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
                  <span className="text-[10px] font-medium text-slate-600">
                    {isGmailActive ? 'Gmail OAuth Active' : user?.isDemo ? 'Demo Mode Active' : 'Account Logged In'}
                  </span>
                </div>
              </div>

              {/* Menu Links */}
              <div className="py-1">
                <button
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    navigate('/settings');
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center space-x-2.5 transition-colors"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-500" />
                  <span>Workspace Settings</span>
                </button>

                <button
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    navigate('/import');
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center space-x-2.5 transition-colors"
                >
                  <Database className="w-3.5 h-3.5 text-slate-500" />
                  <span>Data Sources</span>
                </button>
              </div>

              {/* Logout Item */}
              <div className="py-1">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3.5 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center space-x-2.5 transition-colors font-medium"
                >
                  <LogOut className="w-3.5 h-3.5 text-red-500" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
