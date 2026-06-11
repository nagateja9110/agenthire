import { cn, STATUS_STYLES, STATUS_DOTS, ACTIVE_STATUSES } from '@/lib/utils';

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
