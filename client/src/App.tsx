import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { InboxPage } from './pages/InboxPage';
import { EmailDetailPage } from './pages/EmailDetailPage';
import { StyleProfilePage } from './pages/StyleProfilePage';
import { ImportPage } from './pages/ImportPage';
import { SentPage } from './pages/SentPage';
import { DraftsPage } from './pages/DraftsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { Email, Stats, GmailStatus } from './types';
import { fetchEmails, fetchStats, analyzeInbox, fetchGmailStatus, syncGmail } from './api';
import { AuthProvider, useAuth } from './context/AuthContext';

const ProtectedLayout: React.FC = () => {
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();

  const [emails, setEmails] = useState<Email[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [gmailStatus, setGmailStatus] = useState<GmailStatus | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  // Track last sync time and in-flight status to ensure we never sync more frequently than every 2 minutes
  const lastSyncTimeRef = useRef<number>(0);
  const isSyncRunningRef = useRef<boolean>(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [fetchedEmails, fetchedStats, fetchedGmailStatus] = await Promise.all([
        fetchEmails({
          priority:
            activeFilter === 'Urgent'
              ? 'Urgent'
              : activeFilter === 'Normal'
              ? 'Normal'
              : activeFilter === 'Low'
              ? 'Low'
              : undefined,
          topic:
            activeFilter === 'Action Required'
              ? 'Action Required'
              : activeFilter !== 'All' &&
                activeFilter !== 'Urgent' &&
                activeFilter !== 'Normal' &&
                activeFilter !== 'Low'
              ? activeFilter
              : undefined,
          search: searchQuery || undefined
        }),
        fetchStats(),
        fetchGmailStatus().catch(() => null)
      ]);
      setEmails(fetchedEmails);
      setStats(fetchedStats);
      if (fetchedGmailStatus) setGmailStatus(fetchedGmailStatus);
    } catch (err) {
      console.error('Failed to load workspace data:', err);
    } finally {
      setLoading(false);
    }
  }, [activeFilter, searchQuery]);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [loadData, isAuthenticated]);

  // Sync URL query params with filter if on inbox page
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const priority = params.get('priority');
    const topic = params.get('topic');

    if (priority === 'Urgent') {
      setActiveFilter('Urgent');
    } else if (topic === 'Action Required') {
      setActiveFilter('Action Required');
    } else if (priority === 'Normal') {
      setActiveFilter('Normal');
    } else if (priority === 'Low') {
      setActiveFilter('Low');
    } else if (!priority && !topic && location.pathname === '/inbox') {
      setActiveFilter('All');
    }
  }, [location.search, location.pathname]);

  // Automatic Two-Way Gmail Synchronization (Once every 2 minutes for connected Real Gmail)
  useEffect(() => {
    // 1. Guard: Real Gmail only (strictly disabled for Demo mode or disconnected accounts)
    if (!isAuthenticated || user?.isDemo || !gmailStatus?.connected || gmailStatus?.mode !== 'real') {
      return;
    }

    let isSubscribed = true;

    const performAutoSync = async (isInitial: boolean = false) => {
      const now = Date.now();
      // Guard: Do not sync more frequently than every 2 minutes (120,000 ms)
      if (!isInitial && now - lastSyncTimeRef.current < 120000) {
        return;
      }
      if (isSyncRunningRef.current || !isSubscribed) {
        return;
      }

      try {
        isSyncRunningRef.current = true;
        lastSyncTimeRef.current = Date.now();
        const res = await syncGmail();
        if (
          isSubscribed &&
          res?.stats &&
          (res.stats.imported > 0 ||
            (res.stats as any).updated > 0 ||
            (res.stats as any).sentImported > 0)
        ) {
          loadData();
        }
      } catch (err) {
        // Non-blocking sync error
      } finally {
        isSyncRunningRef.current = false;
      }
    };

    // Initial sync upon connecting / mounting
    performAutoSync(true);

    // 1. Periodic background sync once every 2 minutes (120,000 ms)
    const interval = setInterval(() => {
      performAutoSync(false);
    }, 120000);

    // 2. Foreground sync when returning to the tab (throttled to 2-minute interval)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        performAutoSync(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    // 3. Stop timer immediately on logout, disconnect, or unmount
    return () => {
      isSubscribed = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [isAuthenticated, user?.isDemo, gmailStatus?.connected, gmailStatus?.mode, loadData]);

  const handleTriggerTriage = async () => {
    try {
      setIsAnalyzing(true);
      await analyzeInbox();
      await loadData();
    } catch (err) {
      console.error('Failed to analyze inbox:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#fafaf9] font-sans text-slate-900">
      {/* 240px Compact Left Sidebar */}
      <Sidebar stats={stats} gmailStatus={gmailStatus} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Compact Top Bar */}
        <Navbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onRefresh={loadData}
          onTriggerTriage={handleTriggerTriage}
          isAnalyzing={isAnalyzing}
          gmailStatus={gmailStatus}
        />

        {/* Dynamic Route View */}
        <main className="flex-1 flex min-h-0 overflow-hidden bg-white">
          <Routes>
            <Route
              path="inbox"
              element={
                <InboxPage
                  emails={emails}
                  stats={stats}
                  loading={loading}
                  onRefresh={loadData}
                  activeFilter={activeFilter}
                  onFilterChange={setActiveFilter}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                />
              }
            />
            <Route
              path="email/:id"
              element={<EmailDetailPage onRefreshStats={loadData} />}
            />
            <Route
              path="import"
              element={<ImportPage onTriageComplete={loadData} />}
            />
            <Route path="drafts" element={<DraftsPage />} />
            <Route path="sent" element={<SentPage />} />
            <Route path="style" element={<StyleProfilePage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route
              path="settings"
              element={<SettingsPage onReset={loadData} />}
            />
            <Route path="*" element={<Navigate to="/inbox" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Landing & Authentication Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Application Workspace Routes */}
          <Route path="/*" element={<ProtectedLayout />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
