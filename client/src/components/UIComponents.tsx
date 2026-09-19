import React from 'react';
import { Inbox, AlertCircle, Sparkles, CheckCircle2, RefreshCw } from 'lucide-react';

export const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
    size?: 'sm' | 'md' | 'lg';
  }
> = ({ variant = 'secondary', size = 'md', className = '', children, ...props }) => {
  const baseClasses =
    'inline-flex items-center justify-center font-medium rounded-md transition-colors select-none focus-visible:outline-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:pointer-events-none';

  const sizeClasses = {
    sm: 'px-2.5 py-1 text-xs gap-1.5',
    md: 'px-3.5 py-1.5 text-xs gap-2',
    lg: 'px-4 py-2 text-sm gap-2',
  }[size];

  const variantClasses = {
    primary:
      'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs active:bg-indigo-800',
    secondary:
      'bg-white text-slate-800 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-xs active:bg-slate-100',
    ghost:
      'text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200',
    outline:
      'border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300',
  }[variant];

  return (
    <button className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`} {...props}>
      {children}
    </button>
  );
};

export const SkeletonRow: React.FC = () => (
  <div className="px-6 py-3.5 border-b border-slate-100 flex items-start space-x-3.5 animate-pulse">
    <div className="w-2 h-2 rounded-full bg-slate-200 mt-2"></div>
    <div className="w-7 h-7 rounded-full bg-slate-200 shrink-0"></div>
    <div className="flex-1 space-y-2">
      <div className="flex items-center justify-between">
        <div className="h-3 w-32 bg-slate-200 rounded"></div>
        <div className="h-3 w-16 bg-slate-200 rounded"></div>
      </div>
      <div className="h-3.5 w-3/4 bg-slate-200 rounded"></div>
      <div className="h-3 w-5/6 bg-slate-100 rounded"></div>
    </div>
  </div>
);

export const SkeletonInbox: React.FC = () => (
  <div className="divide-y divide-slate-100 bg-white">
    <SkeletonRow />
    <SkeletonRow />
    <SkeletonRow />
    <SkeletonRow />
    <SkeletonRow />
  </div>
);

export const EmptyState: React.FC<{
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}> = ({
  title,
  description,
  actionText,
  onAction,
  icon = <Inbox className="w-6 h-6 text-slate-400" />
}) => (
  <div className="py-20 px-4 text-center max-w-sm mx-auto space-y-3">
    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center mx-auto text-slate-500">
      {icon}
    </div>
    <div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{description}</p>
    </div>
    {actionText && onAction && (
      <button
        onClick={onAction}
        className="mt-2 px-3.5 py-1.5 rounded-md bg-white border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-800 shadow-xs transition-colors"
      >
        {actionText}
      </button>
    )}
  </div>
);

export const Toast: React.FC<{
  message: string;
  onClose?: () => void;
  type?: 'info' | 'success' | 'warning';
}> = ({ message, onClose, type = 'info' }) => {
  return (
    <div className="p-3 rounded-md bg-white border border-slate-200 shadow-md text-xs text-slate-800 flex items-center justify-between gap-3 animate-in fade-in">
      <div className="flex items-center space-x-2">
        {type === 'success' ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
        ) : (
          <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
        )}
        <span>{message}</span>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 p-0.5"
        >
          ✕
        </button>
      )}
    </div>
  );
};
