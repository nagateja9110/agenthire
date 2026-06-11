import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const STATUS_STYLES = {
  // candidate statuses
  applied: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  processing: 'bg-blue-50 text-blue-700 border-blue-200',
  shortlisted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  hold: 'bg-amber-50 text-amber-700 border-amber-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  invited: 'bg-violet-50 text-violet-700 border-violet-200',
  // workflow statuses
  pending: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  running: 'bg-blue-50 text-blue-700 border-blue-200',
  waiting_approval: 'bg-amber-50 text-amber-700 border-amber-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
  // log statuses
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
