import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Tinted pill styles per status, light + dark. Workflow node colors on the
 * canvas still come from /specs - these are purely UI chrome.
 */
export const STATUS_STYLES = {
  // candidate statuses
  applied:
    'bg-zinc-500/10 text-zinc-600 border-zinc-500/20 dark:text-zinc-300',
  processing:
    'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400',
  shortlisted:
    'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400',
  hold: 'bg-amber-500/10 text-amber-600 border-amber-500/25 dark:text-amber-400',
  rejected: 'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400',
  invited:
    'bg-violet-500/10 text-violet-600 border-violet-500/20 dark:text-violet-400',
  interviewed:
    'bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:text-indigo-400',
  // workflow statuses
  pending: 'bg-zinc-500/10 text-zinc-600 border-zinc-500/20 dark:text-zinc-300',
  running: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400',
  waiting_approval:
    'bg-amber-500/10 text-amber-600 border-amber-500/25 dark:text-amber-400',
  completed:
    'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400',
  failed: 'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400',
  // log statuses
  success:
    'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400',
};

export const STATUS_DOTS = {
  applied: 'bg-zinc-400',
  processing: 'bg-blue-500',
  shortlisted: 'bg-emerald-500',
  hold: 'bg-amber-500',
  rejected: 'bg-red-500',
  invited: 'bg-violet-500',
  interviewed: 'bg-indigo-500',
  pending: 'bg-zinc-400',
  running: 'bg-blue-500',
  waiting_approval: 'bg-amber-500',
  completed: 'bg-emerald-500',
  failed: 'bg-red-500',
  success: 'bg-emerald-500',
};

// Statuses where the dot should pulse (work in flight).
export const ACTIVE_STATUSES = ['pending', 'running', 'processing', 'waiting_approval'];

export function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function timeAgo(value) {
  if (!value) return '-';
  const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
}

export function initials(name) {
  return String(name || '?')
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function scoreColor(score) {
  if (score == null) return 'text-muted-foreground';
  if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 60) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}
