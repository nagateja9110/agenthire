import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Spinner({ className }) {
  return <Loader2 className={cn('h-4 w-4 animate-spin text-zinc-500', className)} />;
}

export function PageLoader({ label = 'Loading...' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-500">
      <Spinner /> {label}
    </div>
  );
}
