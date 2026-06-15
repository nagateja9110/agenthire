'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, Check, X, Sparkles, Gavel, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EngineBadge } from '@/components/status-badge';
import { Spinner } from '@/components/ui/spinner';

const DECISION_META = {
  shortlisted: { label: 'Shortlisted', cls: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  hold: { label: 'On hold', cls: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  rejected: { label: 'Rejected', cls: 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400' },
};

const ACTIVE = ['pending', 'running'];

// Plain-English justification for the shortlisting decision, from the spec thresholds.
function thresholdRationale(shortlist) {
  if (!shortlist) return '';
  const s = shortlist.match_score;
  const t = shortlist.thresholds || {};
  if (shortlist.decision === 'shortlisted') {
    return `Match score ${s} is at or above the shortlist threshold of ${t.shortlist_min}, so the AI recommends shortlisting.`;
  }
  if (shortlist.decision === 'hold') {
    return `Match score ${s} falls between the hold threshold (${t.hold_min}) and the shortlist threshold (${t.shortlist_min}), so it was placed on hold for your review.`;
  }
  return `Match score ${s} is below the minimum threshold of ${t.hold_min}, so the AI recommends rejecting.`;
}

function Bar({ label, value, max }) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums">
          {Math.round(value)}/{max}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function AiAssessment({ candidate, onDecision }) {
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const [acting, setActing] = useState('');
  const workflowId = candidate.workflow_id;

  const load = useCallback(async () => {
    if (!workflowId) return null;
    try {
      const data = await api(`/workflow/${workflowId}`);
      setDetail(data);
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, [workflowId]);

  useEffect(() => {
    load();
  }, [load]);

  // Poll while the workflow is still scoring (so the assessment fills in live).
  const detailRef = useRef(null);
  detailRef.current = detail;
  useEffect(() => {
    const t = setInterval(() => {
      const st = detailRef.current?.workflow?.status;
      if (st && ACTIVE.includes(st)) load();
    }, 3000);
    return () => clearInterval(t);
  }, [load]);

  if (!workflowId) return null;
  if (error) return null;
  if (!detail) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Spinner /> Loading AI assessment...
        </CardContent>
      </Card>
    );
  }

  const wf = detail.workflow;
  const out = wf.state_output || {};
  const matching = out.matching_agent;
  const shortlist = out.shortlisting_agent;

  // Still scoring - matching/shortlisting not produced yet.
  if (!matching || !shortlist) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-blue-500" />
          The AI is still evaluating this candidate ({wf.current_state || 'starting'})...
        </CardContent>
      </Card>
    );
  }

  const decision = DECISION_META[shortlist.decision] || DECISION_META.hold;
  const matchedRequired = matching.matched_required || [];
  const missing = matching.missing_skills || [];
  const matchedPreferred = matching.matched_preferred || [];
  const breakdown = matching.breakdown || {};
  const weights = matching.weights || {};
  const waiting = wf.status === 'waiting_approval';

  async function act(dec) {
    setActing(dec);
    try {
      await api('/workflow/approve', { method: 'POST', body: { workflow_id: workflowId, decision: dec } });
      toast.success(dec === 'approved' ? 'Candidate approved' : 'Candidate rejected', {
        description: dec === 'approved' ? 'Generating interview invite...' : 'Sending rejection email...',
      });
      await load();
      onDecision?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActing('');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gavel className="size-4 text-blue-500" /> AI assessment
          <span className={cn('rounded-full border px-2 py-0.5 text-xs font-medium', decision.cls)}>
            {decision.label}
          </span>
          {shortlist.engine && <EngineBadge engine={shortlist.engine} />}
        </CardTitle>
        <CardDescription>Why the AI reached this decision - traceable to the hiring spec.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* the decision rationale */}
        <div className="rounded-xl border bg-muted/30 p-4">
          <p className="text-sm">{thresholdRationale(shortlist)}</p>
          {matching.recommendation && (
            <p className="mt-2 flex gap-2 text-sm text-muted-foreground">
              <Sparkles className="mt-0.5 size-3.5 shrink-0 text-blue-500" />
              {matching.recommendation}
            </p>
          )}
          <p className="mt-2 text-[11px] text-muted-foreground">
            Thresholds from {shortlist.thresholds?.source || 'the shortlisting spec'}.
          </p>
        </div>

        {/* skills evidence */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Required skills</p>
            <div className="flex flex-wrap gap-1.5">
              {matchedRequired.map((s) => (
                <Badge key={s} className="border-emerald-500/30 bg-emerald-500/10 font-normal text-emerald-600 dark:text-emerald-400">
                  <Check className="size-3" /> {s}
                </Badge>
              ))}
              {missing.map((s) => (
                <Badge key={s} className="border-red-500/30 bg-red-500/10 font-normal text-red-600 dark:text-red-400">
                  <X className="size-3" /> {s}
                </Badge>
              ))}
              {matchedRequired.length === 0 && missing.length === 0 && (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Preferred skills</p>
            <div className="flex flex-wrap gap-1.5">
              {matchedPreferred.length === 0 ? (
                <span className="text-xs text-muted-foreground">None matched</span>
              ) : (
                matchedPreferred.map((s) => (
                  <Badge key={s} variant="secondary" className="font-normal">
                    <Check className="size-3" /> {s}
                  </Badge>
                ))
              )}
            </div>
          </div>
        </div>

        {/* score breakdown */}
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Score breakdown ({matching.match_score}/100)
          </p>
          <div className="grid gap-2.5 sm:grid-cols-3">
            <Bar label="Required skills" value={breakdown.required || 0} max={weights.required_skills || 0} />
            <Bar label="Preferred skills" value={breakdown.preferred || 0} max={weights.preferred_skills || 0} />
            <Bar label="Experience" value={breakdown.experience || 0} max={weights.experience || 0} />
          </div>
        </div>

        {/* decision actions */}
        {waiting ? (
          <div className="flex flex-wrap items-center gap-2 border-t pt-4">
            <span className="mr-1 text-sm font-medium">Your decision:</span>
            <Button
              size="sm"
              className="bg-emerald-600 text-white hover:bg-emerald-500"
              disabled={!!acting}
              onClick={() => act('approved')}
            >
              {acting === 'approved' ? <Spinner className="text-white" /> : <CheckCircle2 className="size-4" />}
              Approve & invite to interview
            </Button>
            <Button size="sm" variant="destructive" disabled={!!acting} onClick={() => act('rejected')}>
              {acting === 'rejected' ? <Spinner className="text-white" /> : <XCircle className="size-4" />}
              Reject
            </Button>
          </div>
        ) : (
          wf.approval?.decision && (
            <p className="border-t pt-4 text-sm text-muted-foreground">
              You{' '}
              <strong className={wf.approval.decision === 'approved' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                {wf.approval.decision === 'approved' ? 'approved' : 'rejected'}
              </strong>{' '}
              this candidate.
            </p>
          )
        )}
      </CardContent>
    </Card>
  );
}
