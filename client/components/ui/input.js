'use client';

import { cn } from '@/lib/utils';

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        'flex h-9 w-full rounded-md border border-zinc-300 bg-white px-3 py-1 text-sm',
        'placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400',
        className
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cn(
        'flex min-h-24 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm',
        'placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400',
        className
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }) {
  return <label className={cn('text-sm font-medium text-zinc-700', className)} {...props} />;
}

export function FieldError({ children }) {
  if (!children) return null;
  return <p className="text-xs text-red-600 mt-1">{children}</p>;
}
