import React from 'react';
import { Priority, Topic } from '../types';

export const PriorityBadge: React.FC<{ priority: Priority; size?: 'sm' | 'md' }> = ({
  priority,
  size = 'sm'
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  if (priority === 'Urgent') {
    return (
      <span
        className={`inline-flex items-center space-x-1.5 font-medium rounded-md bg-red-50 text-red-700 border border-red-200/80 ${sizeClasses}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
        <span>URGENT</span>
      </span>
    );
  }

  if (priority === 'Normal') {
    return (
      <span
        className={`inline-flex items-center font-medium rounded-md bg-slate-100 text-slate-700 border border-slate-200/80 ${sizeClasses}`}
      >
        <span>NORMAL</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center font-medium rounded-md bg-stone-100 text-stone-600 border border-stone-200/80 ${sizeClasses}`}
    >
      <span>LOW</span>
    </span>
  );
};

export const TopicBadge: React.FC<{ topic: Topic; size?: 'sm' | 'md' }> = ({
  topic,
  size = 'sm'
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  switch (topic) {
    case 'Action Required':
      return (
        <span
          className={`inline-flex items-center font-medium rounded-md bg-amber-50 text-amber-800 border border-amber-200/80 ${sizeClasses}`}
        >
          <span>ACTION REQUIRED</span>
        </span>
      );
    case 'Work':
      return (
        <span
          className={`inline-flex items-center font-medium rounded-md bg-blue-50 text-blue-700 border border-blue-200/80 ${sizeClasses}`}
        >
          <span>WORK</span>
        </span>
      );
    case 'Personal':
      return (
        <span
          className={`inline-flex items-center font-medium rounded-md bg-violet-50 text-violet-700 border border-violet-200/80 ${sizeClasses}`}
        >
          <span>PERSONAL</span>
        </span>
      );
    case 'Newsletter':
      return (
        <span
          className={`inline-flex items-center font-medium rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80 ${sizeClasses}`}
        >
          <span>NEWSLETTER</span>
        </span>
      );
    default:
      return (
        <span
          className={`inline-flex items-center font-medium rounded-md bg-slate-100 text-slate-600 border border-slate-200/80 ${sizeClasses}`}
        >
          <span>OTHER</span>
        </span>
      );
  }
};

export const PriorityDot: React.FC<{ priority: Priority; className?: string }> = ({ priority, className = '' }) => {
  if (priority === 'Urgent') {
    return (
      <span className={`relative flex h-2 w-2 ${className}`} title="Urgent">
        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
      </span>
    );
  }
  if (priority === 'Normal') {
    return (
      <span className={`inline-flex rounded-full h-2 w-2 bg-blue-400 ${className}`} title="Normal"></span>
    );
  }
  return (
    <span className={`inline-flex rounded-full h-2 w-2 bg-slate-300 ${className}`} title="Low"></span>
  );
};

export const AvatarBadge: React.FC<{ name: string; email?: string; size?: 'sm' | 'md' | 'lg' }> = ({
  name,
  email,
  size = 'md'
}) => {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U';

  const pastelColors = [
    'bg-indigo-50 text-indigo-700 border-indigo-200/80',
    'bg-blue-50 text-blue-700 border-blue-200/80',
    'bg-slate-100 text-slate-700 border-slate-200',
    'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    'bg-violet-50 text-violet-700 border-violet-200/80',
    'bg-amber-50 text-amber-700 border-amber-200/80',
  ];

  // Stable color choice based on name hash
  const charCodeSum = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colorClass = pastelColors[charCodeSum % pastelColors.length];

  const sizeClass =
    size === 'sm' ? 'w-6 h-6 text-[10px]' : size === 'lg' ? 'w-10 h-10 text-sm font-semibold' : 'w-8 h-8 text-xs font-medium';

  return (
    <div
      className={`${sizeClass} ${colorClass} rounded-full border flex items-center justify-center shrink-0 select-none`}
      title={`${name} (${email || ''})`}
    >
      {initials}
    </div>
  );
};

export function formatTimestamp(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();

    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const timeStr = `${formattedHours}:${minutes} ${ampm}`;

    if (isToday) {
      return timeStr;
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    if (isYesterday) {
      return `Yesterday, ${timeStr}`;
    }

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  } catch {
    return isoString;
  }
}

/**
 * Checks whether an email originates from Real Gmail OAuth ingestion (vs Enron/Demo sandbox)
 */
export function isRealGmailEmail(email: { id: string }): boolean {
  return Boolean(email && email.id && email.id.startsWith('gmail_') && !email.id.startsWith('gmail_msg_'));
}

export const SourceBadge: React.FC<{ source: 'gmail' | 'demo'; size?: 'xs' | 'sm' }> = ({
  source,
  size = 'xs'
}) => {
  const sizeClasses = size === 'xs' ? 'px-1.5 py-0.2 text-[10px]' : 'px-2 py-0.5 text-xs';

  if (source === 'gmail') {
    return (
      <span
        className={`inline-flex items-center space-x-1 font-medium rounded bg-red-50 text-red-700 border border-red-200/80 shrink-0 ${sizeClasses}`}
        title="Real Gmail message imported via Google OAuth"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
        <span>Gmail</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center font-medium rounded bg-slate-100 text-slate-600 border border-slate-200/80 shrink-0 ${sizeClasses}`}
      title="Demo / Enron dataset message"
    >
      <span>Demo</span>
    </span>
  );
};
