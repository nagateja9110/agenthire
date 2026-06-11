'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { RefreshCw, Plus, Briefcase, Users, Workflow, CheckCircle2, ArrowRight } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';
import { api } from '@/lib/api';
import { timeAgo, initials } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { StatusBadge } from '@/components/status-badge';
import { PageLoader } from '@/components/ui/spinner';

const chartConfig = {
  applications: { label: 'Applications', color: 'var(--chart-1)' },
  shortlisted: { label: 'Shortlisted', color: 'var(--chart-2)' },
};

function KpiCard({ label, value, icon: Icon, hint, accent }) {
  return (
    <Card className="hover-lift relative overflow-hidden">
      <div className={`absolute inset-x-0 top-0 h-0.5 ${accent}`} />
      <CardContent className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1.5 text-3xl font-bold tracking-tight tabular-nums">{value}</p>
          {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
        </div>
        <div className="flex size-9 items-center justify-center rounded-lg border bg-gradient-to-b from-background to-muted">
          <Icon className="size-4.5 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      setData(await api('/analytics'));
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!data && !error) return <PageLoader label="Loading overview..." />;
  if (error) return <p className="py-10 text-sm text-destructive">{error}</p>;

  const timeline = (data.timeline || []).map((d) => ({
    ...d,
    day: new Date(d.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
  }));
  const totalRecent = timeline.reduce((sum, d) => sum + d.applications, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground">Your hiring pipeline at a glance.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={refreshing}>
          <RefreshCw className={refreshing ? 'size-4 animate-spin' : 'size-4'} /> Refresh
        </Button>
      </div>

      <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Jobs" value={data.totals.jobs} icon={Briefcase} accent="bg-blue-500" hint="open positions" />
        <KpiCard label="Candidates" value={data.totals.candidates} icon={Users} accent="bg-violet-500" hint={`${data.rates.shortlist_rate}% shortlisted`} />
        <KpiCard label="Workflows" value={data.totals.workflows} icon={Workflow} accent="bg-amber-500" hint={`${data.totals.waiting_approval} awaiting approval`} />
        <KpiCard label="Completion" value={`${data.rates.workflow_completion_rate}%`} icon={CheckCircle2} accent="bg-emerald-500" hint={`${data.rates.workflow_failure_rate}% failed`} />
      </div>

      {data.totals.waiting_approval > 0 && (
        <Link href="/dashboard/workflows" className="block">
          <div className="hover-lift flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
            <span>
              <strong>{data.totals.waiting_approval}</strong> workflow
              {data.totals.waiting_approval > 1 ? 's are' : ' is'} waiting for your decision
            </span>
            <ArrowRight className="size-4" />
          </div>
        </Link>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        {/* applications trend */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Applications</CardTitle>
            <CardDescription>
              {totalRecent} application{totalRecent === 1 ? '' : 's'} in the last 14 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-56 w-full">
              <AreaChart data={timeline} margin={{ left: 4, right: 4 }}>
                <defs>
                  <linearGradient id="fillApps" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="fillShort" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} interval="preserveStartEnd" />
                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                <Area dataKey="applications" type="monotone" fill="url(#fillApps)" stroke="var(--chart-1)" strokeWidth={2} />
                <Area dataKey="shortlisted" type="monotone" fill="url(#fillShort)" stroke="var(--chart-2)" strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* recent workflows */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent workflows</CardTitle>
            <CardDescription>Latest candidate runs</CardDescription>
            <CardAction>
              <Link href="/dashboard/workflows" className="text-xs text-muted-foreground hover:text-foreground">
                View all →
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent>
            {data.recent_workflows.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-muted-foreground">No workflows yet.</p>
                <Link href="/dashboard/jobs/create">
                  <Button size="sm" className="mt-3">
                    <Plus className="size-4" /> Create your first job
                  </Button>
                </Link>
              </div>
            ) : (
              <ul className="-mx-2 space-y-0.5">
                {data.recent_workflows.map((wf) => (
                  <li key={wf._id}>
                    <Link
                      href="/dashboard/workflows"
                      className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent"
                    >
                      <Avatar className="size-8">
                        <AvatarFallback className="bg-muted text-[10px] font-semibold">
                          {initials(wf.candidate_id?.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{wf.candidate_id?.name || 'Candidate'}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {wf.job_id?.title} · {timeAgo(wf.created_at)}
                        </p>
                      </div>
                      <StatusBadge status={wf.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
