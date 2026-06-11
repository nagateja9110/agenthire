'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Workflow,
  BarChart3,
  LogOut,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';
import { PageLoader } from '@/components/ui/spinner';

const NAV = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/dashboard/candidates', label: 'Candidates', icon: Users },
  { href: '/dashboard/workflows', label: 'Workflows', icon: Workflow },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
];

export default function DashboardLayout({ children }) {
  const { token, user, hydrated, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (hydrated && !token) router.replace('/login');
  }, [hydrated, token, router]);

  if (!hydrated) return <PageLoader label="Loading session..." />;
  if (!token) return null;

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex w-full shrink-0 flex-row items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 md:min-h-screen md:w-60 md:flex-col md:items-stretch md:justify-start md:border-b-0 md:border-r md:px-4 md:py-6">
        <div>
          <Link href="/dashboard" className="text-base font-bold tracking-tight">
            Agent<span className="text-blue-600">Hire</span>
          </Link>
          <p className="hidden text-[11px] text-zinc-400 md:block">Recruiter console</p>
        </div>

        <nav className="flex flex-row gap-1 md:mt-8 md:flex-col">
          {NAV.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                  active
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="md:mt-auto">
          <div className="hidden border-t border-zinc-100 pt-4 md:block">
            <p className="truncate text-xs font-medium text-zinc-700">{user?.name}</p>
            <p className="truncate text-[11px] text-zinc-400">{user?.email}</p>
          </div>
          <button
            onClick={() => {
              logout();
              router.replace('/login');
            }}
            className="mt-0 flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100 md:mt-3 md:w-full"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
    </div>
  );
}
