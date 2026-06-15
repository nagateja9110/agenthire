import { Sparkles, Cog, Cpu, MailCheck } from 'lucide-react';
import { cn, STATUS_STYLES, STATUS_DOTS, ACTIVE_STATUSES } from '@/lib/utils';

// How each agent was executed: real LLM vs deterministic substitute vs by-design rules.
const ENGINE_META = {
  groq: { label: 'LLM · Groq', icon: Sparkles, cls: 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  openrouter: { label: 'LLM · OpenRouter', icon: Sparkles, cls: 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  resend: { label: 'Email sent', icon: MailCheck, cls: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  'local-model': { label: 'Local model', icon: Cpu, cls: 'border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400' },
  rules: { label: 'Rules engine', icon: Cog, cls: 'border-zinc-500/25 bg-zinc-500/10 text-zinc-600 dark:text-zinc-300' },
  fallback: { label: 'Fallback', icon: Cog, cls: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400' },
};

export function EngineBadge({ engine, className }) {
  const meta = ENGINE_META[engine];
  if (!meta) return null;
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap',
        meta.cls,
        className
      )}
      title={
        engine === 'fallback'
          ? 'Deterministic fallback - no LLM key configured'
          : engine === 'rules'
          ? 'Deterministic rules engine (by design)'
          : `Ran via ${meta.label}`
      }
    >
      <Icon className="size-2.5" />
      {meta.label}
    </span>
  );
}

export function StatusBadge({ status, className }) {
  const key = String(status || 'pending');
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap',
        STATUS_STYLES[key] || STATUS_STYLES.pending,
        className
      )}
    >
      <span
        className={cn(
          'size-1.5 rounded-full',
          STATUS_DOTS[key] || STATUS_DOTS.pending,
          ACTIVE_STATUSES.includes(key) && 'animate-pulse-dot'
        )}
      />
      {key.replace(/_/g, ' ')}
    </span>
  );
}

export function FieldError({ children }) {
  if (!children) return null;
  return <p className="mt-1 text-xs text-destructive">{children}</p>;
}
