import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadDemoInbox, importEmails, loadEnronSample } from '../api';
import { ImportStats } from '../types';
import {
  UploadCloud,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  Database,
  ArrowRight,
  FileText,
  Layers,
  Inbox,
  Send,
  RefreshCw,
  Eye
} from 'lucide-react';

interface PreviewItem {
  subject: string;
  sender: string;
  bodySnippet: string;
}

export const ImportPage: React.FC<{ onTriageComplete?: () => void }> = ({ onTriageComplete }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviews, setFilePreviews] = useState<PreviewItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const [largFileWarning, setLargeFileWarning] = useState<string | null>(null);

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'json' && ext !== 'csv') {
      setErrorMsg('Invalid file format. Please upload a CSV or JSON file.');
      return;
    }
    setErrorMsg(null);
    setSelectedFile(file);
    setImportStats(null);
    setLargeFileWarning(null);

    // Large-file guard: files >2 MB risk browser OOM — skip browser-side parse
    const MAX_PREVIEW_BYTES = 2 * 1024 * 1024; // 2 MB
    if (file.size > MAX_PREVIEW_BYTES) {
      setFilePreviews([]);
      setLargeFileWarning(
        `Large file detected (${(file.size / 1024 / 1024).toFixed(1)} MB). ` +
        `Browser preview is disabled to prevent memory exhaustion. ` +
        `Only the first 200 records will be imported. ` +
        `For the full recommended dataset, use "Load Enron Dataset" above.`
      );
      return;
    }

    // Read small preview (files ≤2 MB only)
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const previews: PreviewItem[] = [];

        if (ext === 'json') {
          const parsed = JSON.parse(text);
          const list = Array.isArray(parsed)
            ? parsed
            : Array.isArray(parsed.inbox)
            ? [...parsed.inbox, ...(parsed.sent || [])]
            : parsed.emails || [];

          list.slice(0, 4).forEach((item: any) => {
            previews.push({
              subject: item.subject || 'No Subject',
              sender: item.from || item.sender || 'Unknown',
              bodySnippet: (item.body || item.content || '').slice(0, 100)
            });
          });
        } else {
          // CSV preview
          const lines = text.split('\n').filter((l) => l.trim().length > 0);
          if (lines.length > 1) {
            lines.slice(1, 5).forEach((line) => {
              const parts = line.split(',');
              previews.push({
                subject: parts[2]?.replace(/"/g, '') || parts[0]?.replace(/"/g, '') || 'Email record',
                sender: parts[0]?.replace(/"/g, '') || 'colleague@mailpilot.demo',
                bodySnippet: line.slice(0, 100)
              });
            });
          }
        }
        setFilePreviews(previews);
      } catch {
        setErrorMsg('Could not parse file preview. File may contain malformed content.');
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteUpload = async () => {
    if (!selectedFile) return;

    // Use a tighter limit for large files to avoid server overload
    const isLargeFile = selectedFile.size > 2 * 1024 * 1024;
    const importLimit = isLargeFile ? 200 : 100;

    try {
      setIsImporting(true);
      setErrorMsg(null);
      setProgressMessage(
        isLargeFile
          ? `Uploading large file — importing first ${importLimit} records only...`
          : 'Uploading and parsing email records...'
      );

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('limit', String(importLimit));

      const res = await importEmails(formData);
      setImportStats(res.stats);
      setLargeFileWarning(null);
      if (onTriageComplete) onTriageComplete();
    } catch (err: any) {
      setErrorMsg(err.message || 'Import failed');
    } finally {
      setIsImporting(false);
      setProgressMessage('');
    }
  };

  const handleLoadEnronSample = async () => {
    try {
      setIsImporting(true);
      setErrorMsg(null);
      setProgressMessage('Ingesting Enron pool dataset, grouping threads, and persisting to Supabase...');

      const res = await loadEnronSample(75);
      setImportStats(res.stats);
      setSelectedFile(null);
      setFilePreviews([]);
      if (onTriageComplete) onTriageComplete();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load Enron dataset');
    } finally {
      setIsImporting(false);
      setProgressMessage('');
    }
  };

  const handleLoadLegacyDemo = async () => {
    try {
      setIsImporting(true);
      setErrorMsg(null);
      setProgressMessage('Restoring clean 27-email demo mailbox...');
      await loadDemoInbox();
      setImportStats({
        imported: 39,
        skipped: 0,
        duplicates: 0,
        inbox: 27,
        sent: 12,
        threads: 5,
        errors: 0
      });
      if (onTriageComplete) onTriageComplete();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load demo inbox');
    } finally {
      setIsImporting(false);
      setProgressMessage('');
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto bg-white font-sans">
      {/* Header */}
      <div className="px-8 pt-7 pb-5 border-b border-slate-200/80 bg-[#fafaf9]/60 shrink-0">
        <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Import Emails</h1>
        <p className="text-xs text-slate-500 mt-1">
          Normalize raw RFC 822 messages, group conversation threads, and store in Supabase PostgreSQL.
        </p>
      </div>

      <div className="p-8 max-w-3xl mx-auto w-full space-y-6">
        {/* Large file safety warning */}
        {largFileWarning && (
          <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start space-x-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <span>{largFileWarning}</span>
          </div>
        )}

        {/* Error notification */}
        {errorMsg && (
          <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. Quick Load Enron Dataset (Recommended 1-Click Option) */}
        <div className="p-5 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50/40 via-purple-50/20 to-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs">
          <div className="space-y-1 text-left w-full sm:w-auto">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
              <h3 className="text-sm font-semibold text-slate-900">Enron Email Dataset Preset</h3>
              <span className="text-[10px] uppercase font-bold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded border border-indigo-200">
                Recommended
              </span>
            </div>
            <p className="text-xs text-slate-600 max-w-lg">
              Load 75 realistic Enron corporate emails (inbox + sent), automatically parsed, clean of forwarded clutter, and linked into conversation threads.
            </p>
          </div>

          <button
            onClick={handleLoadEnronSample}
            disabled={isImporting}
            className="w-full sm:w-auto px-4 py-2 rounded-md text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-2xs transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center space-x-2 shrink-0"
          >
            <Database className="w-3.5 h-3.5 text-white" />
            <span>Load Enron Dataset</span>
          </button>
        </div>

        {/* 2. Upload Custom File (CSV or JSON) */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
            isDragging
              ? 'border-indigo-500 bg-indigo-50/40'
              : selectedFile
              ? 'border-indigo-300 bg-indigo-50/10'
              : 'border-slate-200 hover:border-slate-300 bg-[#fafaf9]/40'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json,.csv"
            className="hidden"
          />

          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
            <UploadCloud className="w-5 h-5" />
          </div>

          <h3 className="text-sm font-semibold text-slate-900 mb-1">
            {selectedFile ? selectedFile.name : 'Upload Enron CSV or JSON'}
          </h3>
          <p className="text-xs text-slate-500 mb-3">
            Drag Kaggle Enron emails.csv or JSON export here
          </p>

          <span className="text-[11px] text-slate-400 block mb-3">or</span>

          <button
            type="button"
            className="px-3.5 py-1.5 rounded-md text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-2xs transition-colors"
          >
            {selectedFile ? 'Change selected file' : 'Browse local file'}
          </button>

          <p className="mt-3 text-[11px] text-slate-400">
            Supports standard Enron format (file, message) or custom email CSV/JSON
          </p>
        </div>

        {/* File Preview Table if file selected (only shown for small files with parsed previews) */}
        {selectedFile && filePreviews.length > 0 && (
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-900">
                <Eye className="w-3.5 h-3.5 text-slate-400" />
                <span>File Preview (First {filePreviews.length} records detected)</span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">{selectedFile.name}</span>
            </div>

            <div className="space-y-2">
              {filePreviews.map((p, idx) => (
                <div key={idx} className="p-2.5 rounded-md bg-[#fafaf9] border border-slate-100 text-xs flex flex-col space-y-1">
                  <div className="flex items-center justify-between font-medium text-slate-800">
                    <span className="truncate max-w-sm">{p.subject}</span>
                    <span className="text-[11px] text-slate-400 font-normal">{p.sender}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">{p.bodySnippet}...</div>
                </div>
              ))}
            </div>

            <button
              onClick={handleExecuteUpload}
              disabled={isImporting}
              className="w-full mt-2 py-2 px-4 rounded-md text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-2xs transition-colors flex items-center justify-center space-x-1.5 disabled:opacity-50"
            >
              <FileText className="w-3.5 h-3.5 text-white" />
              <span>Import & Normalize {selectedFile.name}</span>
            </button>
          </div>
        )}

        {/* Show import button for large files even without preview */}
        {selectedFile && filePreviews.length === 0 && largFileWarning && (
          <div className="p-4 rounded-xl border border-slate-200 bg-white">
            <button
              onClick={handleExecuteUpload}
              disabled={isImporting}
              className="w-full py-2 px-4 rounded-md text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-2xs transition-colors flex items-center justify-center space-x-1.5 disabled:opacity-50"
            >
              <FileText className="w-3.5 h-3.5 text-white" />
              <span>Import First 200 Records from {selectedFile.name}</span>
            </button>
            <p className="mt-2 text-[11px] text-slate-400 text-center">
              Real Gmail records will not be affected.
            </p>
          </div>
        )}

        {/* Loading Progress State */}
        {isImporting && (
          <div className="p-6 rounded-xl border border-indigo-100 bg-indigo-50/30 text-center space-y-3 animate-in fade-in">
            <div className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <div className="text-xs font-medium text-slate-900">{progressMessage}</div>
            <p className="text-[11px] text-slate-500">Processing stream, deduplicating IDs, and linking threads.</p>
          </div>
        )}

        {/* 3. Import Results Summary Card */}
        {importStats && (
          <div className="p-6 rounded-xl border border-emerald-200 bg-emerald-50/20 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-semibold text-slate-900">Import Complete</h3>
              </div>
              <span className="text-[11px] font-medium text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded">
                Stored in Supabase
              </span>
            </div>

            {/* Statistics Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-center">
              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <div className="text-lg font-bold text-slate-900">{importStats.imported}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Imported</div>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <div className="text-lg font-bold text-indigo-600">{importStats.inbox}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Inbox</div>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <div className="text-lg font-bold text-emerald-600">{importStats.sent}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Sent</div>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <div className="text-lg font-bold text-purple-600">{importStats.threads}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Threads</div>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <div className="text-lg font-bold text-amber-600">{importStats.duplicates}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Duplicates</div>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <div className="text-lg font-bold text-slate-500">{importStats.errors}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Errors</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                onClick={() => navigate('/inbox')}
                className="w-full sm:flex-1 py-2 px-4 rounded-md text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-2xs transition-colors flex items-center justify-center space-x-1.5"
              >
                <Inbox className="w-3.5 h-3.5 text-white" />
                <span>View Imported Emails in Inbox</span>
                <ArrowRight className="w-3.5 h-3.5 text-white" />
              </button>

              <button
                onClick={() => {
                  setImportStats(null);
                  setSelectedFile(null);
                  setFilePreviews([]);
                }}
                className="w-full sm:w-auto py-2 px-3.5 rounded-md text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Import Another File
              </button>
            </div>
          </div>
        )}

        {/* 4. Reset to Clean Demo Dataset fallback */}
        <div className="p-4 rounded-xl border border-slate-200/80 bg-[#fafaf9] flex items-center justify-between">
          <div className="space-y-0.5">
            <h4 className="text-xs font-semibold text-slate-800">Clean Demo Mailbox</h4>
            <p className="text-[11px] text-slate-500">
              Reset mailbox to the default 27 emails and 12 sent messages.
            </p>
          </div>

          <button
            onClick={handleLoadLegacyDemo}
            disabled={isImporting}
            className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-2xs transition-colors shrink-0 disabled:opacity-50"
          >
            Reset to Demo
          </button>
        </div>
      </div>
    </div>
  );
};
