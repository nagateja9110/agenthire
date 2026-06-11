'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { STATUS_STYLES, cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageLoader } from '@/components/ui/spinner';

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/analytics').then(setData).catch((err) => setError(err.message));
  }, []);

  if (!data && !error) return <PageLoader label="Loading analytics..." />;
  if (error) return <p className="py-10 text-sm text-red-600">{error}</p>;

  const totalCandidates = data.totals.candidates || 1;
  const rates = [
    { label: 'Shortlist rate', value: data.rates.shortlist_rate, color: 'bg-emerald-500' },
    { label: 'Workflow completion', value: data.rates.workflow_completion_rate, color: 'bg-blue-500' },
    { label: 'Workflow failures', value: data.rates.workflow_failure_rate, color: 'bg-red-500' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Analytics</h1>
        <p className="text-sm text-zinc-500">Candidate statistics and agent execution metrics.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {rates.map((r) => (
          <Card key={r.label}>
            <CardContent className="pt-4">
              <div className="flex items-end justify-between">
                <p className="text-xs text-zinc-500">{r.label}</p>
                <p className="text-2xl font-bold">{r.value}%</p>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100">
                <div className={`h-full ${r.color}`} style={{ width: `${Math.min(r.value, 100)}%` }} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Candidates by status</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(data.candidates_by_status).length === 0 ? (
              <p className="py-6 text-center text-sm text-zinc-400">No candidates yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {Object.entries(data.candidates_by_status).map(([status, count]) => (
                  <li key={status} className="flex items-center gap-3 text-sm">
                    <span
                      className={cn(
                        'w-28 shrink-0 rounded-full border px-2 py-0.5 text-center text-xs font-medium',
                        STATUS_STYLES[status]
                      )}
                    >
                      {status.replace(/_/g, ' ')}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className="h-full bg-zinc-700"
                        style={{ width: `${(count / totalCandidates) * 100}%` }}
                      />
                    </div>
                    <span className="w-8 text-right font-medium">{count}</span>
                  </li>
                ))}
              </ul>
            )}
            {data.rates.average_match_score != null && (
              <p className="mt-4 text-xs text-zinc-500">
                Average match score: <strong>{data.rates.average_match_score}/100</strong>
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Agent execution metrics</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto px-0">
            {data.agent_metrics.length === 0 ? (
              <p className="py-6 text-center text-sm text-zinc-400">No agent runs yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 text-left text-xs uppercase tracking-wide text-zinc-400">
                    <th className="px-5 py-2 font-medium">Agent</th>
                    <th className="px-5 py-2 font-medium">Runs</th>
                    <th className="px-5 py-2 font-medium">Failures</th>
                    <th className="px-5 py-2 font-medium">Avg duration</th>
                  </tr>
                </thead>
                <tbody>
                  {data.agent_metrics.map((m) => (
                    <tr key={m.agent} className="border-b border-zinc-50 last:border-0">
                      <td className="px-5 py-2">
                        <code className="text-xs">{m.agent}</code>
                      </td>
                      <td className="px-5 py-2">{m.executions}</td>
                      <td className={`px-5 py-2 ${m.failures ? 'text-red-600 font-medium' : ''}`}>
                        {m.failures}
                      </td>
                      <td className="px-5 py-2 text-zinc-500">
                        {m.avg_duration_ms != null ? `${m.avg_duration_ms}ms` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
