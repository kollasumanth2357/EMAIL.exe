import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  loadDemoInbox,
  fetchSettings,
  connectGmailDemo,
  disconnectGmail,
  syncGmail,
  GMAIL_OAUTH_START_URL
} from '../api';
import { GmailStatus } from '../types';
import {
  CheckCircle2,
  Database,
  Sparkles,
  User,
  Shield,
  Info,
  ArrowRight,
  Mail,
  Sliders,
  RefreshCw,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { Toast } from '../components/UIComponents';

export const SettingsPage: React.FC<{ onReset?: () => void }> = ({ onReset }) => {
  const navigate = useNavigate();
  const [resetting, setResetting] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // Settings & Gmail demo state
  const [settingsData, setSettingsData] = useState<any>(null);
  const [gmailStatus, setGmailStatus] = useState<GmailStatus | null>(null);
  const [isGmailActionLoading, setIsGmailActionLoading] = useState(false);

  useEffect(() => {
    loadSettings();

    // Check for query parameters returned from Google OAuth callback
    const params = new URLSearchParams(window.location.search);
    if (params.get('gmail_success') === 'true') {
      setStatusNotice('Gmail Connected! Real inbox is ready for synchronization.');
      window.history.replaceState({}, document.title, window.location.pathname);
      loadSettings();
    } else if (params.get('gmail_error')) {
      const err = params.get('gmail_error');
      setStatusNotice(`Gmail OAuth error: ${err}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const loadSettings = async () => {
    try {
      const data = await fetchSettings();
      setSettingsData(data);
      if (data.gmail) setGmailStatus(data.gmail);
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const handleResetDemo = async () => {
    try {
      setResetting(true);
      await loadDemoInbox();
      if (onReset) onReset();
      setStatusNotice('Demo dataset restored to clean state.');
      setTimeout(() => setStatusNotice(null), 4000);
      loadSettings();
    } catch (err: any) {
      setStatusNotice('Reset error: ' + err.message);
    } finally {
      setResetting(false);
    }
  };

  const handleConnectRealGmail = () => {
    window.location.href = GMAIL_OAUTH_START_URL;
  };

  const handleConnectDemoGmail = async () => {
    try {
      setIsGmailActionLoading(true);
      const res = await connectGmailDemo('alex.morgan@gmail.com');
      setGmailStatus(res);
      setStatusNotice('Connected to Gmail Sandbox as alex.morgan@gmail.com (Read-Only).');
      setTimeout(() => setStatusNotice(null), 4000);
    } catch (err: any) {
      setStatusNotice('Gmail connect error: ' + err.message);
    } finally {
      setIsGmailActionLoading(false);
    }
  };

  const handleDisconnectGmail = async () => {
    try {
      setIsGmailActionLoading(true);
      const res = await disconnectGmail();
      setGmailStatus(res);
      setStatusNotice('Disconnected from Gmail.');
      setTimeout(() => setStatusNotice(null), 4000);
    } catch (err: any) {
      setStatusNotice('Gmail disconnect error: ' + err.message);
    } finally {
      setIsGmailActionLoading(false);
    }
  };

  const handleSyncGmail = async () => {
    try {
      setIsGmailActionLoading(true);
      const res = await syncGmail();
      setGmailStatus(res.gmailStatus);
      if (res.message) {
        setStatusNotice(res.message);
      } else {
        const isReal = res.gmailStatus.mode === 'real';
        if (res.stats.imported > 0) {
          setStatusNotice(`Synced ${res.stats.imported} new Gmail messages.`);
        } else if (res.stats.duplicates > 0) {
          setStatusNotice(`Gmail inbox is already up to date — ${res.stats.duplicates} messages verified, 0 new.`);
        } else {
          setStatusNotice(`${isReal ? 'Real Gmail' : 'Gmail Sandbox'} synchronized: ${res.stats.imported} messages ingested into threads.`);
        }
      }
      if (onReset) onReset();
      setTimeout(() => setStatusNotice(null), 5000);
    } catch (err: any) {
      setStatusNotice('Gmail sync error: ' + err.message);
    } finally {
      setIsGmailActionLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto bg-white font-sans">
      {/* Header */}
      <div className="px-8 pt-7 pb-5 border-b border-slate-200/80 bg-[#fafaf9]/60 shrink-0">
        <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Settings</h1>
        <p className="text-xs text-slate-500 mt-1">
          Workspace configuration, integrations, and AI persona calibration.
        </p>
      </div>

      <div className="p-8 max-w-3xl mx-auto w-full space-y-6">
        {statusNotice && (
          <Toast message={statusNotice} onClose={() => setStatusNotice(null)} type="success" />
        )}

        {/* Section 1: Gmail Integration (Real OAuth & Read-Only Sandbox) */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Mail className="w-4 h-4 text-red-500" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                Gmail Integration
              </h2>
            </div>
            {gmailStatus?.configured ? (
              gmailStatus?.connected && gmailStatus?.mode === 'real' ? (
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Gmail Connected
                </span>
              ) : (
                <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Google OAuth Ready
                </span>
              )
            ) : (
              <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Demo Sandbox
              </span>
            )}
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-1">
              <div>
                <div className="font-medium text-slate-900">Connection Status</div>
                <div className="text-[11px] text-slate-500">
                  {gmailStatus?.connected
                    ? `Connected as ${gmailStatus.accountEmail} (${
                        gmailStatus.mode === 'real' ? 'Real OAuth' : 'Demo Sandbox'
                      })`
                    : 'Not connected'}
                </div>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-medium border ${
                  gmailStatus?.connected
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                    : 'text-slate-600 bg-slate-50 border-slate-200'
                }`}
              >
                {gmailStatus?.connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-t border-slate-100 pt-2">
              <div>
                <div className="font-medium text-slate-900">Permission Scopes</div>
                <div className="text-[11px] text-slate-500">Read inbox + mark as read + send replies in-thread</div>
              </div>
              <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                gmail.modify + gmail.send
              </span>
            </div>

            {/* Notice Callout */}
            {gmailStatus?.configured ? (
              gmailStatus?.connected ? (
                <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-200 text-emerald-800 text-[11px] space-y-1">
                  <div className="flex items-center space-x-1.5 font-medium text-emerald-900">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Gmail OAuth Session Active</span>
                  </div>
                  <p className="text-emerald-700 leading-relaxed">
                    Authenticated via Google OAuth 2.0. Read, mark as read, and send replies are
                    enabled. Replies dispatched via &ldquo;Approve &amp; Send&rdquo; appear in your Gmail
                    Sent folder and in the original thread.
                  </p>
                  {/* Re-authorize nudge if old gmail.readonly scope was previously granted */}
                  {gmailStatus?.scopes && !gmailStatus.scopes.some(s => s.includes('gmail.send')) && (
                    <div className="mt-2 p-2 rounded bg-amber-50 border border-amber-200 text-amber-800 flex items-start space-x-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <span>
                        Your current session uses an older read-only scope. Disconnect and reconnect
                        to grant send permissions.
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-indigo-50/60 border border-indigo-200 text-indigo-800 text-[11px] space-y-1">
                  <div className="flex items-center space-x-1.5 font-medium text-indigo-900">
                    <Shield className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>Google OAuth Credentials Configured</span>
                  </div>
                  <p className="text-indigo-700 leading-relaxed">
                    Credentials detected in server configuration. Click &ldquo;Connect Real Gmail&rdquo; to
                    begin the standard Google OAuth authorization flow.
                  </p>
                </div>
              )
            ) : (
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-[11px] space-y-1">
                <div className="flex items-center space-x-1.5 font-medium text-slate-800">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Sandbox Demo Mode Active</span>
                </div>
                <p className="text-slate-500 leading-relaxed">
                  Google OAuth credentials (<code className="text-slate-700">GOOGLE_CLIENT_ID</code> /{' '}
                  <code className="text-slate-700">GOOGLE_CLIENT_SECRET</code>) are not configured.
                  Operating in a safe sandbox simulation that demonstrates the complete connection and
                  RFC 822 thread normalization pipeline with zero account risk.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <div>
                {/* Secondary fallback toggle if credentials configured but user wants demo */}
                {gmailStatus?.configured && !gmailStatus?.connected && (
                  <button
                    onClick={handleConnectDemoGmail}
                    disabled={isGmailActionLoading}
                    className="text-[11px] text-slate-500 hover:text-slate-700 underline"
                  >
                    Or connect Demo Sandbox
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {gmailStatus?.connected ? (
                  <>
                    <button
                      onClick={handleSyncGmail}
                      disabled={isGmailActionLoading}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors disabled:opacity-60"
                    >
                      <RefreshCw className={`w-3 h-3 ${isGmailActionLoading ? 'animate-spin' : ''}`} />
                      <span>{gmailStatus.mode === 'real' ? 'Sync Gmail' : 'Sync Sandbox Inbox'}</span>
                    </button>
                    <button
                      onClick={handleDisconnectGmail}
                      disabled={isGmailActionLoading}
                      className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
                    >
                      Disconnect
                    </button>
                  </>
                ) : gmailStatus?.configured ? (
                  <button
                    onClick={handleConnectRealGmail}
                    disabled={isGmailActionLoading}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 shadow-2xs transition-colors disabled:opacity-60"
                  >
                    <Mail className="w-3.5 h-3.5 text-indigo-200" />
                    <span>Connect Real Gmail</span>
                    <ExternalLink className="w-3 h-3 text-indigo-200 ml-1" />
                  </button>
                ) : (
                  <button
                    onClick={handleConnectDemoGmail}
                    disabled={isGmailActionLoading}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 shadow-2xs transition-colors disabled:opacity-60"
                  >
                    <Mail className="w-3.5 h-3.5 text-indigo-200" />
                    <span>Connect Gmail (Demo)</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: AI Preferences */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 shadow-2xs">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
              AI Preferences
            </h2>
          </div>

          <div className="flex items-center justify-between text-xs py-1">
            <div>
              <div className="font-medium text-slate-900">Primary AI Model</div>
              <div className="text-[11px] text-slate-500">Groq API Structured JSON triage & drafts</div>
            </div>
            <span className="text-xs font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded font-medium">
              llama-3.3-70b-versatile
            </span>
          </div>

          <div className="flex items-center justify-between text-xs py-1 border-t border-slate-100 pt-2">
            <div>
              <div className="font-medium text-slate-900">Secondary Groq Fallback</div>
              <div className="text-[11px] text-slate-500">Fast rate-limit failover before heuristics</div>
            </div>
            <span className="text-xs font-mono text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-medium">
              openai/gpt-oss-120b
            </span>
          </div>

          <div className="flex items-center justify-between text-xs py-1 border-t border-slate-100 pt-2">
            <div>
              <div className="font-medium text-slate-900">Reliability Fallback Engine</div>
              <div className="text-[11px] text-slate-500">Heuristic engine ensures 100% uptime with zero crashes</div>
            </div>
            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-medium">
              Active
            </span>
          </div>
        </div>

        {/* Section 3: Writing Style Profile */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-purple-600" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                Learned Writing Style
              </h2>
            </div>
            <button
              onClick={() => navigate('/style')}
              className="inline-flex items-center space-x-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
            >
              <span>Full Profile</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-500">Tone Persona</span>
              <span className="font-medium text-slate-900">
                {settingsData?.style?.tone || 'Professional & Direct'}
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-500">Formality Level</span>
              <span className="font-medium text-slate-700">
                {settingsData?.style?.formality || 'Moderately formal'}
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-500">Preferred Greeting</span>
              <span className="font-mono text-slate-800 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                {settingsData?.style?.greeting || 'Hi {name},'}
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-500">Preferred Sign-off</span>
              <span className="font-mono text-slate-800 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                {settingsData?.style?.signoff ? settingsData.style.signoff.replace('\n', ' ') : 'Regards, Sai'}
              </span>
            </div>
          </div>
        </div>

        {/* Section 4: Tone Customization Reference */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 shadow-2xs">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
            <Sliders className="w-4 h-4 text-indigo-600" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
              Tone Customization Scale (1–5)
            </h2>
          </div>

          <p className="text-xs text-slate-500">
            When regenerating drafts, the tone slider modifies the Groq prompt dynamically without altering your base style profile.
          </p>

          <div className="space-y-2 pt-1">
            {[
              { level: 1, name: 'More Casual', desc: 'Relaxed phrasing, informal salutation ("Hey Jordan, ... Best, Sai")' },
              { level: 2, name: 'Slightly Casual', desc: 'Friendly conversational tone ("Hi Jordan, ... Thanks, Sai")' },
              { level: 3, name: 'Balanced', desc: 'Your learned default profile ("Hi Jordan, ... Regards, Sai")' },
              { level: 4, name: 'More Formal', desc: 'Structured syntax and deference ("Dear Jordan, ... Best regards, Sai")' },
              { level: 5, name: 'Highly Formal', desc: 'Traditional executive salutation ("Dear Jordan, ... Sincerely, Sai")' }
            ].map((t) => (
              <div key={t.level} className="flex items-baseline justify-between text-xs py-1 border-b border-slate-50 last:border-0">
                <span className="font-medium text-slate-900 shrink-0 w-36">
                  Level {t.level}: {t.name}
                </span>
                <span className="text-slate-500 text-[11px]">{t.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Section 5: Data & Database */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 shadow-2xs">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
            <Database className="w-4 h-4 text-slate-500" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
              Database Persistence
            </h2>
          </div>

          <div className="flex items-center justify-between text-xs py-1">
            <div>
              <div className="font-medium text-slate-900">Database Engine</div>
              <div className="text-[11px] text-slate-500">Supabase PostgreSQL Cloud Database</div>
            </div>
            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-medium">
              Connected
            </span>
          </div>

          <div className="flex items-center justify-between text-xs py-2 border-t border-slate-100">
            <div>
              <div className="font-medium text-slate-900">Demo Data Reset</div>
              <div className="text-[11px] text-slate-500">Re-seed clean demo mailbox & sent examples</div>
            </div>
            <button
              onClick={handleResetDemo}
              disabled={resetting}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors active:scale-95 disabled:opacity-50"
            >
              {resetting ? 'Resetting...' : 'Reset Demo Data'}
            </button>
          </div>
        </div>

        {/* Section 6: About */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-2 text-xs shadow-2xs">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
            <Info className="w-4 h-4 text-slate-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
              About MailPilot
            </h2>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-slate-500">Product</span>
            <span className="font-medium text-slate-900">MailPilot</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-slate-500">Tagline</span>
            <span className="text-slate-700">AI Email Inbox Triage & Draft Assistant</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-slate-500">Architecture</span>
            <span className="font-mono text-slate-600 text-[11px]">Groq + Supabase PostgreSQL + React</span>
          </div>
        </div>
      </div>
    </div>
  );
};

