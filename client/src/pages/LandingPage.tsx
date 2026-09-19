import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  ShieldCheck,
  Zap,
  Mail,
  ArrowRight,
  CheckCircle2,
  Lock,
  Layers,
  BarChart3,
  Sliders,
  Send
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginDemo, isAuthenticated } = useAuth();

  const handleOneClickDemo = () => {
    loginDemo();
    navigate('/inbox');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fafaf9] via-white to-slate-50 text-slate-900 font-sans flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Navigation Bar */}
      <nav className="h-16 border-b border-slate-200/80 bg-white/80 backdrop-blur-md px-6 md:px-12 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base tracking-tight text-slate-900 leading-tight">
              MailPilot
            </span>
            <span className="text-[11px] text-slate-500 font-medium leading-tight">
              AI Email Assistant
            </span>
          </div>
        </div>

        <div className="hidden md:flex items-center space-x-8 text-xs font-medium text-slate-600">
          <a href="#features" className="hover:text-indigo-600 transition-colors">Features</a>
          <a href="#intelligence" className="hover:text-indigo-600 transition-colors">AI Intelligence</a>
          <a href="#security" className="hover:text-indigo-600 transition-colors">Zero-Risk SMTP</a>
          <a href="#how-it-works" className="hover:text-indigo-600 transition-colors">Workflow</a>
        </div>

        <div className="flex items-center space-x-3">
          {isAuthenticated ? (
            <button
              onClick={() => navigate('/inbox')}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-sm transition-all flex items-center space-x-1.5"
            >
              <span>Go to App</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <>
              <button
                onClick={() => navigate('/login')}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={handleOneClickDemo}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-all flex items-center space-x-1"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>One-Click Demo</span>
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 px-6 md:px-12 text-center max-w-5xl mx-auto flex-1 flex flex-col items-center justify-center">
        {/* Highlight Pill */}
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-medium mb-6 shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>Groq Llama-3 AI Engine · Human-in-the-Loop Safeguards</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15] max-w-4xl">
          Executive Email Intelligence, <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-800 bg-clip-text text-transparent">
            Calibrated to Your Exact Tone.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-sm sm:text-base text-slate-600 max-w-2xl leading-relaxed">
          MailPilot triages overwhelming inboxes, distills threads into 2-line executive briefings, 
          and generates context-aware replies matching your writing style — with complete human approval.
        </p>

        {/* Call to Actions */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3.5">
          <button
            onClick={handleOneClickDemo}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 shadow-md shadow-indigo-200 hover:shadow-indigo-300 transition-all flex items-center justify-center space-x-2 active:scale-98"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>Launch One-Click Demo</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>

          <button
            onClick={() => navigate('/login')}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white border border-slate-200/90 text-slate-800 text-sm font-semibold hover:bg-slate-50 shadow-2xs hover:border-slate-300 transition-all"
          >
            Sign In with Account
          </button>
        </div>

        {/* Live Feature Preview Card */}
        <div className="mt-14 w-full max-w-4xl bg-white rounded-2xl border border-slate-200/90 shadow-xl overflow-hidden text-left p-6 sm:p-8">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-400"></div>
              <div className="w-3 h-3 rounded-full bg-amber-400"></div>
              <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
              <span className="text-xs font-semibold text-slate-700 ml-2">Inbox Triage Engine</span>
            </div>
            <span className="text-[11px] font-medium text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
              Live Simulation
            </span>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Urgent Triaging</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">Urgent</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Prioritizes critical blockers & timeline risks automatically using semantic AI classification.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">2-Line Briefing</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">Summary</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Replaces wall-of-text threads with concise executive bullet points & required actions.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Tone-Matched Reply</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">Approved</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Learned greetings, signoffs, and brevity calibration ensure every draft sounds authentically like you.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features Grid */}
      <section id="features" className="py-16 px-6 md:px-12 bg-white border-t border-slate-200/80">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Designed for Speed, Safety & Clarity
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-500">
              Everything you need to regain inbox control without ever sending hallucinated emails.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl border border-slate-200/90 bg-[#fafaf9]/70 space-y-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Groq Fast AI Triage</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Blazing fast sub-second classification categorizes emails into Urgent, Action Required, Normal, and Low priorities with topic tagging.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200/90 bg-[#fafaf9]/70 space-y-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Sliders className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Personalized Tone Calibration</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Extracts your communication habits (formality, brevity, greeting patterns) from your sent archive to draft responses that match your voice.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200/90 bg-[#fafaf9]/70 space-y-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Human-Approved Dispatch</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Zero rogue emails. You review, fine-tune with the tone slider, and explicitly approve drafts before they dispatch.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-8 px-6 md:px-12 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 rounded bg-indigo-600 flex items-center justify-center text-white text-[10px] font-bold">
              MP
            </div>
            <span className="font-semibold text-slate-800">MailPilot</span>
            <span>— AI Email Assistant</span>
          </div>
          <div className="flex items-center space-x-6 text-[11px] text-slate-500">
            <span>Powered by Groq & Supabase</span>
            <span>·</span>
            <span>Real Gmail OAuth Ready</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
