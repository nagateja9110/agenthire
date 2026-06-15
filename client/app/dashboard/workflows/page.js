'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, RotateCcw, Workflow as WorkflowIcon, ChevronDown, UserRound } from 'lucide-react';
import { api } from '@/lib/api';
import { cn, timeAgo, initials } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { StatusBadge, EngineBadge } from '@/components/status-badge';
import { PageLoader, Spinner } from '@/components/ui/spinner';
import WorkflowCanvas from '@/components/WorkflowCanvas';

const ACTIVE = ['pending', 'running', 'waiting_approval'];
const POLL_MS = 3000; // per spec: poll every 3s while workflows are active

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const [acting, setActing] = useState('');
  const selectedIdRef = useRef(null);
  selectedIdRef.current = selectedId;

  const load = useCallback(async () => {
    try {
      const data = await api('/workflows?limit=50');
      setWorkflows(data.items);
      if (!selectedIdRef.current && data.items.length) setSelectedId(data.items[0]._id);
      setError('');
      return data.items;
    } catch (err) {
      setError(err.message);
      return [];
    }
  }, []);

  const loadDetail = useCallback(async (id) => {
    if (!id) return;
    try {
      setDetail(await api(`/workflow/${id}`));
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setDetail(null);
    loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const items = await load();
      const moving =
        items.some((w) => ACTIVE.includes(w.status)) ||
        (detail && ACTIVE.includes(detail.workflow.status));
      if (moving && selectedIdRef.current) loadDetail(selectedIdRef.current);
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [load, loadDetail, detail]);

  async function act(path, body, label, messages) {
    setActing(label);
    try {
      await api(path, { method: 'POST', body });
      toast.success(messages.title, { description: messages.description });
      await load();
      await loadDetail(selectedIdRef.current);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActing('');
    }
  }

  if (!workflows && !error) return <PageLoader label="Loading workflows..." />;

  const wf = detail?.workflow;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Workflows</h1>
        <p className="text-sm text-muted-foreground">
          Live LangGraph executions - approve or reject candidates at the checkpoint.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {workflows && workflows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl border bg-muted">
              <WorkflowIcon className="size-5 text-muted-foreground" />
            </div>
            <p className="mt-4 text-sm font-medium">No workflows yet</p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              Workflows start automatically the moment a candidate uploads a resume.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
          {/* execution list */}
          <Card className="h-fit py-0 xl:sticky xl:top-20">
            <CardContent className="px-2 py-2">
              <ul className="max-h-[620px] space-y-0.5 overflow-y-auto">
                {workflows.map((w) => (
                  <li key={w._id}>
                    <button
                      onClick={() => setSelectedId(w._id)}
                      className={cn(
                        'w-full cursor-pointer rounded-lg px-2.5 py-2.5 text-left transition-colors',
                        selectedId === w._id
                          ? 'bg-accent shadow-[inset_2px_0_0] shadow-blue-500'
                          : 'hover:bg-accent/60'
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Avatar className="size-7">
                          <AvatarFallback className="bg-muted text-[9px] font-semibold">
                            {initials(w.candidate_id?.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-medium">
                              {w.candidate_id?.name || 'Candidate'}
                            </p>
                            <StatusBadge status={w.status} />
                          </div>
                          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                            {w.job_id?.title} · {timeAgo(w.created_at)}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* detail */}
          <div className="space-y-4">
            {!detail ? (
              <PageLoader label="Loading workflow detail..." />
            ) : (
              <>
                {/* header card */}
                <Card>
                  <CardContent className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-10">
                        <AvatarFallback className="bg-gradient-to-br from-blue-500/15 to-violet-500/15 text-xs font-semibold">
                          {initials(wf.candidate_id?.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/dashboard/candidates/${wf.candidate_id?._id}`}
                            className="font-semibold underline-offset-4 hover:underline"
                          >
                            {wf.candidate_id?.name}
                          </Link>
                          <StatusBadge status={wf.status} />
                          {(() => {
                            const engines = Object.values(wf.state_output || {})
                              .map((o) => o && o.engine)
                              .filter(Boolean);
                            const llm = engines.find((e) => e === 'groq' || e === 'openrouter');
                            // Show the overall AI mode for this run at a glance.
                            return <EngineBadge engine={llm || (engines.length ? 'fallback' : null)} />;
                          })()}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {wf.job_id?.title} · match score{' '}
                          <strong className="text-foreground">
                            {wf.candidate_id?.match_score ?? '—'}
                          </strong>{' '}
                          · state{' '}
                          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
                            {wf.current_state || '—'}
                          </code>
                        </p>
                        {wf.error && <p className="mt-1 text-xs text-destructive">{wf.error}</p>}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link href={`/dashboard/candidates/${wf.candidate_id?._id}`}>
                        <Button variant="outline" size="sm">
                          <UserRound className="size-4" /> View profile & resume
                        </Button>
                      </Link>
                      {wf.status === 'waiting_approval' && (
                        <>
                          <Button
                            size="sm"
                            className="bg-emerald-600 text-white hover:bg-emerald-500"
                            disabled={!!acting}
                            onClick={() =>
                              act(
                                '/workflow/approve',
                                { workflow_id: wf._id, decision: 'approved' },
                                'approve',
                                { title: 'Candidate approved', description: 'Generating interview kit and invite email...' }
                              )
                            }
                          >
                            {acting === 'approve' ? <Spinner className="text-white" /> : <CheckCircle2 className="size-4" />}
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={!!acting}
                            onClick={() =>
                              act(
                                '/workflow/approve',
                                { workflow_id: wf._id, decision: 'rejected' },
                                'reject',
                                { title: 'Candidate rejected', description: 'Sending rejection email...' }
                              )
                            }
                          >
                            {acting === 'reject' ? <Spinner className="text-white" /> : <XCircle className="size-4" />}
                            Reject
                          </Button>
                        </>
                      )}
                      {wf.status === 'failed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!!acting}
                          onClick={() =>
                            act('/workflow/retry', { workflow_id: wf._id }, 'retry', {
                              title: 'Retrying workflow',
                              description: 'Resuming from the last checkpoint.',
                            })
                          }
                        >
                          {acting === 'retry' ? <Spinner /> : <RotateCcw className="size-4" />}
                          Retry from checkpoint
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* canvas */}
                <Card className="gap-3 py-4">
                  <CardHeader className="py-0">
                    <CardTitle>Execution graph</CardTitle>
                    <CardDescription className="flex flex-wrap items-center gap-3">
                      {Object.entries(detail.node_state_colors).map(([state, palette]) => (
                        <span key={state} className="inline-flex items-center gap-1.5 text-[11px]">
                          <span
                            className="size-2 rounded-full border"
                            style={{ background: palette.background, borderColor: palette.border }}
                          />
                          {palette.label || state}
                        </span>
                      ))}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <WorkflowCanvas
                      nodeStates={detail.node_states}
                      colors={detail.node_state_colors}
                      activeState={wf.current_state}
                    />
                  </CardContent>
                </Card>

                {/* logs timeline */}
                <Card>
                  <CardHeader>
                    <CardTitle>Execution log</CardTitle>
                    <CardDescription>
                      Every agent run persisted to workflow_logs - retries included.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ol className="relative space-y-0">
                      {detail.logs.map((log, i) => (
                        <li key={log._id} className="relative flex gap-3 pb-4">
                          {i < detail.logs.length - 1 && (
                            <span className="absolute top-5 left-[7px] h-full w-px bg-border" />
                          )}
                          <span
                            className={cn(
                              'relative mt-1.5 size-[15px] shrink-0 rounded-full border-2 border-background ring-1',
                              log.status === 'success' && 'bg-emerald-500 ring-emerald-500/30',
                              log.status === 'failed' && 'bg-red-500 ring-red-500/30',
                              log.status === 'running' && 'bg-blue-500 ring-blue-500/30 animate-pulse-dot',
                              log.status === 'waiting_approval' && 'bg-amber-500 ring-amber-500/30'
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <code className="font-mono text-xs font-semibold">{log.agent_name}</code>
                              <StatusBadge status={log.status} />
                              {log.output?.engine && <EngineBadge engine={log.output.engine} />}
                              {log.attempt > 1 && (
                                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-700 dark:text-amber-400">
                                  attempt {log.attempt}
                                </span>
                              )}
                              <span className="ml-auto text-[11px] text-muted-foreground">
                                {timeAgo(log.created_at)}
                                {log.duration_ms != null && (
                                  <span className="ml-1.5 font-mono">{log.duration_ms}ms</span>
                                )}
                              </span>
                            </div>
                            {log.error && <p className="mt-1 text-xs text-destructive">{log.error}</p>}
                            {log.output && (
                              <details className="group mt-1.5">
                                <summary className="inline-flex cursor-pointer items-center gap-1 text-[11px] text-muted-foreground transition-colors select-none hover:text-foreground">
                                  <ChevronDown className="size-3 transition-transform group-open:rotate-180" />
                                  output
                                </summary>
                                <pre className="mt-1.5 max-h-48 overflow-auto rounded-lg border bg-muted/50 p-3 font-mono text-[11px] leading-relaxed">
                                  {JSON.stringify(log.output, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
