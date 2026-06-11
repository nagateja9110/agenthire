'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import { api } from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { PageLoader, Spinner } from '@/components/ui/spinner';
import WorkflowCanvas from '@/components/WorkflowCanvas';

const ACTIVE_STATUSES = ['pending', 'running', 'waiting_approval'];
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

  // Poll while anything visible is still moving.
  useEffect(() => {
    const interval = setInterval(async () => {
      const items = await load();
      const detailActive =
        detail && ACTIVE_STATUSES.includes(detail.workflow.status);
      const listActive = items.some((w) => ACTIVE_STATUSES.includes(w.status));
      if ((detailActive || listActive) && selectedIdRef.current) {
        loadDetail(selectedIdRef.current);
      }
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [load, loadDetail, detail]);

  async function act(path, body, label) {
    setActing(label);
    try {
      await api(path, { method: 'POST', body });
      await load();
      await loadDetail(selectedIdRef.current);
    } catch (err) {
      setError(err.message);
    } finally {
      setActing('');
    }
  }

  if (!workflows && !error) return <PageLoader label="Loading workflows..." />;

  const wf = detail?.workflow;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Workflows</h1>
        <p className="text-sm text-zinc-500">
          Live LangGraph executions. Approve or reject candidates at the checkpoint.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {workflows && workflows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-zinc-400">
            No workflows yet - they start automatically when a candidate uploads a resume.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Executions</CardTitle>
            </CardHeader>
            <CardContent className="px-2">
              <ul className="max-h-[560px] space-y-1 overflow-y-auto">
                {workflows.map((w) => (
                  <li key={w._id}>
                    <button
                      onClick={() => setSelectedId(w._id)}
                      className={cn(
                        'w-full cursor-pointer rounded-lg px-3 py-2 text-left transition-colors',
                        selectedId === w._id ? 'bg-zinc-100' : 'hover:bg-zinc-50'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium">
                          {w.candidate_id?.name || 'Candidate'}
                        </p>
                        <StatusBadge status={w.status} />
                      </div>
                      <p className="mt-0.5 truncate text-xs text-zinc-500">
                        {w.job_id?.title} · {formatDate(w.created_at)}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {!detail ? (
              <PageLoader label="Loading workflow detail..." />
            ) : (
              <>
                <Card>
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-semibold">{wf.candidate_id?.name}</h2>
                        <StatusBadge status={wf.status} />
                      </div>
                      <p className="text-xs text-zinc-500">
                        {wf.job_id?.title} · score{' '}
                        <strong>{wf.candidate_id?.match_score ?? '-'}</strong> · current state:{' '}
                        <code className="rounded bg-zinc-100 px-1">{wf.current_state || '-'}</code>
                      </p>
                      {wf.error && <p className="mt-1 text-xs text-red-600">{wf.error}</p>}
                    </div>

                    <div className="flex gap-2">
                      {wf.status === 'waiting_approval' && (
                        <>
                          <Button
                            variant="success"
                            size="sm"
                            disabled={!!acting}
                            onClick={() =>
                              act('/workflow/approve', { workflow_id: wf._id, decision: 'approved' }, 'approve')
                            }
                          >
                            {acting === 'approve' ? <Spinner className="text-white" /> : <CheckCircle2 className="h-4 w-4" />}
                            Approve
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={!!acting}
                            onClick={() =>
                              act('/workflow/approve', { workflow_id: wf._id, decision: 'rejected' }, 'reject')
                            }
                          >
                            {acting === 'reject' ? <Spinner className="text-white" /> : <XCircle className="h-4 w-4" />}
                            Reject
                          </Button>
                        </>
                      )}
                      {wf.status === 'failed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!!acting}
                          onClick={() => act('/workflow/retry', { workflow_id: wf._id }, 'retry')}
                        >
                          {acting === 'retry' ? <Spinner /> : <RotateCcw className="h-4 w-4" />}
                          Retry
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <WorkflowCanvas
                  nodeStates={detail.node_states}
                  colors={detail.node_state_colors}
                  activeState={wf.current_state}
                />

                <Card>
                  <CardHeader>
                    <CardTitle>Execution logs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {detail.logs.map((log) => (
                        <li key={log._id} className="rounded-lg border border-zinc-100 px-3 py-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <code className="text-xs font-semibold">{log.agent_name}</code>
                              <StatusBadge status={log.status} />
                              {log.attempt > 1 && (
                                <span className="text-[11px] text-amber-600">attempt {log.attempt}</span>
                              )}
                            </div>
                            <span className="text-[11px] text-zinc-400">
                              {formatDate(log.created_at)}
                              {log.duration_ms != null ? ` · ${log.duration_ms}ms` : ''}
                            </span>
                          </div>
                          {log.error && <p className="mt-1 text-xs text-red-600">{log.error}</p>}
                          {log.output && (
                            <details className="mt-1">
                              <summary className="cursor-pointer text-[11px] text-zinc-400 hover:text-zinc-600">
                                output
                              </summary>
                              <pre className="mt-1 max-h-44 overflow-auto rounded bg-zinc-50 p-2 text-[11px] leading-relaxed">
                                {JSON.stringify(log.output, null, 2)}
                              </pre>
                            </details>
                          )}
                        </li>
                      ))}
                    </ul>
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
