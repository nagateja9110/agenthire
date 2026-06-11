'use client';

import { cn } from '@/lib/utils';

const variants = {
  default: 'bg-zinc-900 text-white hover:bg-zinc-700',
  outline: 'border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50',
  ghost: 'text-zinc-700 hover:bg-zinc-100',
  success: 'bg-emerald-600 text-white hover:bg-emerald-500',
  destructive: 'bg-red-600 text-white hover:bg-red-500',
};

const sizes = {
  default: 'h-9 px-4 text-sm',
  sm: 'h-8 px-3 text-xs',
  lg: 'h-10 px-6 text-sm',
};

export function Button({ className, variant = 'default', size = 'default', ...props }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors',
        'disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}
