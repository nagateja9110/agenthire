'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { RefreshCw, Plus, Briefcase, Users, Workflow, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { PageLoader } from '@/components/ui/spinner';

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
  if (error) return <p className="py-10 text-sm text-red-600">{error}</p>;

  const stats = [
    { label: 'Jobs', value: data.totals.jobs, icon: Briefcase },
    { label: 'Candidates', value: data.totals.candidates, icon: Users },
    { label: 'Workflows', value: data.totals.workflows, icon: Workflow },
    { label: 'Completion', value: `${data.rates.workflow_completion_rate}%`, icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Overview</h1>
          <p className="text-sm text-zinc-500">Your hiring pipeline at a glance.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={refreshing}>
            <RefreshCw className={refreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /> Refresh
          </Button>
          <Link href="/dashboard/jobs/create">
            <Button>
              <Plus className="h-4 w-4" /> Create job
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex items-center justify-between pt-4">
              <div>
                <p className="text-xs text-zinc-500">{label}</p>
                <p className="mt-1 text-2xl font-bold">{value}</p>
              </div>
              <Icon className="h-6 w-6 text-zinc-300" />
            </CardContent>
          </Card>
        ))}
      </div>

      {data.totals.waiting_approval > 0 && (
        <Link href="/dashboard/workflows" className="block">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <strong>{data.totals.waiting_approval}</strong> workflow
            {data.totals.waiting_approval > 1 ? 's are' : ' is'} waiting for your approval →
          </div>
        </Link>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent workflows</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recent_workflows.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-400">
              No workflows yet. Create a job and share its public apply link.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {data.recent_workflows.map((wf) => (
                <li key={wf._id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="font-medium">{wf.candidate_id?.name || 'Candidate'}</p>
                    <p className="text-xs text-zinc-500">
                      {wf.job_id?.title} · {formatDate(wf.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={wf.status} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
