'use client';

import { useEffect, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Pie, PieChart, XAxis, YAxis, Cell } from 'recharts';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { PageLoader } from '@/components/ui/spinner';

const STATUS_CHART_COLORS = {
  applied: 'var(--chart-3)',
  processing: 'var(--chart-1)',
  shortlisted: 'var(--chart-2)',
  hold: 'var(--chart-3)',
  rejected: 'var(--chart-5)',
  invited: 'var(--chart-4)',
};

const trendConfig = {
  applications: { label: 'Applications', color: 'var(--chart-1)' },
  shortlisted: { label: 'Shortlisted', color: 'var(--chart-2)' },
};

const agentConfig = {
  avg_duration_ms: { label: 'Avg duration (ms)', color: 'var(--chart-1)' },
};

function RateCard({ label, value, sub, color }) {
  return (
    <Card className="hover-lift">
      <CardContent>
        <div className="flex items-end justify-between">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold tracking-tight tabular-nums">{value}%</p>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full ${color} transition-all duration-700`}
            style={{ width: `${Math.min(value, 100)}%` }}
          />
        </div>
        {sub && <p className="mt-2 text-[11px] text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/analytics').then(setData).catch((err) => setError(err.message));
  }, []);

  if (!data && !error) return <PageLoader label="Loading analytics..." />;
  if (error) return <p className="py-10 text-sm text-destructive">{error}</p>;

  const timeline = (data.timeline || []).map((d) => ({
    ...d,
    day: new Date(d.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
  }));

  const statusData = Object.entries(data.candidates_by_status).map(([status, count]) => ({
    status,
    count,
    fill: STATUS_CHART_COLORS[status] || 'var(--chart-3)',
  }));

  const statusConfig = Object.fromEntries(
    statusData.map((d) => [d.status, { label: d.status.replace(/_/g, ' '), color: d.fill }])
  );

  const agentData = data.agent_metrics.map((m) => ({
    agent: m.agent.replace(/_agent$|_/g, ' ').trim(),
    avg_duration_ms: m.avg_duration_ms || 0,
    executions: m.executions,
    failures: m.failures,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Candidate statistics, workflow health and agent execution metrics.
        </p>
      </div>

      <div className="stagger grid gap-4 lg:grid-cols-3">
        <RateCard
          label="Shortlist rate"
          value={data.rates.shortlist_rate}
          color="bg-emerald-500"
          sub={`${data.totals.candidates} total candidates · avg score ${data.rates.average_match_score ?? '—'}`}
        />
        <RateCard
          label="Workflow completion"
          value={data.rates.workflow_completion_rate}
          color="bg-blue-500"
          sub={`${data.totals.workflows} workflow runs`}
        />
        <RateCard
          label="Workflow failures"
          value={data.rates.workflow_failure_rate}
          color="bg-red-500"
          sub="retryable from the last checkpoint"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Application trend</CardTitle>
          <CardDescription>Applications vs shortlisted, last 14 days</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={trendConfig} className="h-64 w-full">
            <AreaChart data={timeline} margin={{ left: 4, right: 4 }}>
              <defs>
                <linearGradient id="aFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.04} />
                </linearGradient>
                <linearGradient id="sFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} interval="preserveStartEnd" />
              <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Area dataKey="applications" type="monotone" fill="url(#aFill)" stroke="var(--chart-1)" strokeWidth={2} />
              <Area dataKey="shortlisted" type="monotone" fill="url(#sFill)" stroke="var(--chart-2)" strokeWidth={2} />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Candidates by status</CardTitle>
            <CardDescription>Pipeline distribution</CardDescription>
          </CardHeader>
          <CardContent>
            {statusData.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No candidates yet.</p>
            ) : (
              <ChartContainer config={statusConfig} className="mx-auto h-64 w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent nameKey="status" hideLabel />} />
                  <Pie data={statusData} dataKey="count" nameKey="status" innerRadius={55} strokeWidth={4}>
                    {statusData.map((entry) => (
                      <Cell key={entry.status} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent nameKey="status" />} className="flex-wrap" />
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Agent execution time</CardTitle>
            <CardDescription>Average duration per agent across all runs</CardDescription>
          </CardHeader>
          <CardContent>
            {agentData.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No agent runs yet.</p>
            ) : (
              <ChartContainer config={agentConfig} className="h-64 w-full">
                <BarChart data={agentData} layout="vertical" margin={{ left: 8, right: 8 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                  <XAxis type="number" tickLine={false} axisLine={false} />
                  <YAxis dataKey="agent" type="category" tickLine={false} axisLine={false} width={90} tick={{ fontSize: 11 }} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                  <Bar dataKey="avg_duration_ms" fill="var(--chart-1)" radius={[0, 4, 4, 0]} barSize={18} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {data.agent_metrics.length > 0 && (
        <Card className="py-0">
          <CardContent className="overflow-x-auto px-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs tracking-wide text-muted-foreground uppercase">
                  <th className="px-5 py-3 font-medium">Agent</th>
                  <th className="px-5 py-3 font-medium">Runs</th>
                  <th className="px-5 py-3 font-medium">Failures</th>
                  <th className="px-5 py-3 font-medium">Avg duration</th>
                </tr>
              </thead>
              <tbody>
                {data.agent_metrics.map((m) => (
                  <tr key={m.agent} className="border-b last:border-0 hover:bg-accent/40">
                    <td className="px-5 py-2.5">
                      <code className="font-mono text-xs">{m.agent}</code>
                    </td>
                    <td className="px-5 py-2.5 tabular-nums">{m.executions}</td>
                    <td className={`px-5 py-2.5 tabular-nums ${m.failures ? 'font-medium text-destructive' : ''}`}>
                      {m.failures}
                    </td>
                    <td className="px-5 py-2.5 font-mono text-xs text-muted-foreground">
                      {m.avg_duration_ms != null ? `${m.avg_duration_ms}ms` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
