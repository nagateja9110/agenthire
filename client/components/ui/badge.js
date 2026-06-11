import { cn, STATUS_STYLES } from '@/lib/utils';

export function Badge({ className, children, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }) {
  return (
    <Badge className={STATUS_STYLES[status] || STATUS_STYLES.pending}>
      {String(status || 'unknown').replace(/_/g, ' ')}
    </Badge>
  );
}
