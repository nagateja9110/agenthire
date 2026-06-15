'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Workflow,
  BarChart3,
  LogOut,
  Plus,
  ChevronsUpDown,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { cn, initials } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/theme-toggle';
import { PageLoader } from '@/components/ui/spinner';

const NAV_GROUPS = [
  {
    label: 'General',
    items: [{ href: '/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true }],
  },
  {
    label: 'Recruiting',
    items: [
      { href: '/dashboard/jobs', label: 'Jobs', icon: Briefcase },
      { href: '/dashboard/candidates', label: 'Candidates', icon: Users },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/dashboard/workflows', label: 'Workflows', icon: Workflow },
      { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
];

const CRUMB_LABELS = {
  dashboard: 'Dashboard',
  jobs: 'Jobs',
  create: 'Create',
  candidates: 'Candidates',
  workflows: 'Workflows',
  analytics: 'Analytics',
};

function NavLink({ item, pathname }) {
  const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        'group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
        active
          ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
          : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
      )}
    >
      {active && (
        <span className="absolute top-1/2 -left-2 h-4 w-1 -translate-y-1/2 rounded-full bg-blue-500" />
      )}
      <Icon className={cn('size-4', active && 'text-blue-600 dark:text-blue-400')} />
      {item.label}
    </Link>
  );
}

export default function DashboardLayout({ children }) {
  const { token, user, hydrated, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (hydrated && !token) router.replace('/login');
  }, [hydrated, token, router]);

  if (!hydrated) return <PageLoader label="Loading session..." />;
  if (!token) return null;

  const crumbs = pathname.split('/').filter(Boolean);

  return (
    <div className="flex min-h-screen">
      {/* sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-sidebar md:flex">
        <div className="flex items-center gap-2 px-5 pt-5 pb-4">
          <Image src="/logo.png" alt="AgentHire logo" width={32} height={32} className="rounded-lg shadow-sm" />
          <div>
            <p className="text-sm leading-none font-bold tracking-tight">
              Agent<span className="text-blue-600 dark:text-blue-400">Hire</span>
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">Recruiter console</p>
          </div>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-3">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="px-3 pb-1.5 text-[10px] font-semibold tracking-widest text-muted-foreground/70 uppercase">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink key={item.href} item={item} pathname={pathname} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-sidebar-accent">
                <Avatar className="size-8">
                  <AvatarFallback className="bg-gradient-to-br from-blue-600 to-violet-600 text-xs font-semibold text-white">
                    {initials(user?.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{user?.name}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{user?.email}</p>
                </div>
                <ChevronsUpDown className="size-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-52">
              <DropdownMenuLabel className="text-xs">
                Signed in as <span className="font-medium">{user?.email}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => {
                  logout();
                  router.replace('/login');
                }}
              >
                <LogOut className="size-4" /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* topbar */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b bg-background/80 px-4 backdrop-blur md:px-6">
          <div className="flex min-w-0 items-center gap-2">
            {/* mobile brand */}
            <Link href="/dashboard" className="mr-1 flex items-center gap-2 text-sm font-bold md:hidden">
              <Image src="/logo.png" alt="AgentHire logo" width={22} height={22} className="rounded" />
              <span>
                Agent<span className="text-blue-600 dark:text-blue-400">Hire</span>
              </span>
            </Link>
            <nav className="hidden items-center gap-1.5 text-sm text-muted-foreground md:flex">
              {crumbs.map((crumb, i) => {
                const href = '/' + crumbs.slice(0, i + 1).join('/');
                const isLast = i === crumbs.length - 1;
                const label = CRUMB_LABELS[crumb] || crumb.slice(0, 10);
                return (
                  <span key={href} className="flex items-center gap-1.5">
                    {i > 0 && <span className="text-muted-foreground/40">/</span>}
                    {isLast ? (
                      <span className="font-medium text-foreground">{label}</span>
                    ) : (
                      <Link href={href} className="transition-colors hover:text-foreground">
                        {label}
                      </Link>
                    )}
                  </span>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/dashboard/jobs/create">
              <Button size="sm">
                <Plus className="size-4" /> <span className="hidden sm:inline">Create job</span>
              </Button>
            </Link>
          </div>
        </header>

        {/* mobile nav */}
        <nav className="flex gap-1 overflow-x-auto border-b bg-background px-3 py-2 md:hidden">
          {NAV_GROUPS.flatMap((g) => g.items).map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  active
                    ? 'border-foreground bg-foreground text-background'
                    : 'text-muted-foreground hover:bg-accent'
                )}
              >
                <Icon className="size-3.5" /> {item.label}
              </Link>
            );
          })}
        </nav>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
