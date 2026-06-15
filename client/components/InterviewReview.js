'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Mic, Copy, ThumbsUp, ThumbsDown, Minus, Bot, User } from 'lucide-react';
import { api } from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EngineBadge } from '@/components/status-badge';
import { Spinner } from '@/components/ui/spinner';

const LEVEL_META = {
  strong_yes: { label: 'Strong yes', cls: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400', icon: ThumbsUp },
  yes: { label: 'Yes', cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', icon: ThumbsUp },
  no: { label: 'No', cls: 'bg-red-500/10 text-red-600 dark:text-red-400', icon: ThumbsDown },
  strong_no: { label: 'Strong no', cls: 'bg-red-500/15 text-red-600 dark:text-red-400', icon: ThumbsDown },
  not_assessed: { label: 'Not assessed', cls: 'bg-zinc-500/10 text-muted-foreground', icon: Minus },
};

const REC_META = {
  advance: { label: 'Advance', cls: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  borderline: { label: 'Borderline', cls: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  do_not_advance: { label: 'Do not advance', cls: 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400' },
};

export function InterviewReview({ candidateId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/candidates/${candidateId}/interview`)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [candidateId]);

  if (error) return null;
  if (!data) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Spinner /> Loading interview...
        </CardContent>
      </Card>
    );
  }
  if (!data.exists) return null;

  const ev = data.evaluation || {};
  const rec = REC_META[ev.recommendation];
  const pairs = [];
  for (const t of data.transcript || []) {
    if (t.role === 'interviewer') pairs.push({ q: t.text, a: '', mode: null });
    else if (pairs.length) {
      pairs[pairs.length - 1].a = t.text;
      pairs[pairs.length - 1].mode = t.input_mode;
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(data.link);
    toast.success('Interview link copied');
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="size-4 text-indigo-500" /> Voice interview
        </CardTitle>
        <CardDescription>
          {data.status === 'completed'
            ? `Completed ${formatDate(data.completed_at)}`
            : data.status === 'expired'
            ? 'Link expired before completion'
            : 'Invitation sent - awaiting the candidate'}
        </CardDescription>
        {data.status !== 'completed' && (
          <div className="pt-1">
            <Button variant="outline" size="sm" onClick={copyLink}>
              <Copy className="size-3.5" /> Copy interview link
            </Button>
          </div>
        )}
      </CardHeader>

      {data.status === 'completed' && (
        <CardContent className="space-y-5">
          {/* verdict */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-muted/30 p-4">
            <div className="text-center">
              <p className="text-[11px] text-muted-foreground">Score</p>
              <p className="text-2xl font-bold tabular-nums">{ev.overall_score ?? '—'}</p>
            </div>
            <div className="h-10 w-px bg-border" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {rec && (
                  <span className={cn('rounded-full border px-2 py-0.5 text-xs font-medium', rec.cls)}>
                    {rec.label}
                  </span>
                )}
                {ev.engine && <EngineBadge engine={ev.engine} />}
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground">{ev.summary}</p>
            </div>
          </div>

          {/* rubric scores */}
          {ev.criteria?.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Rubric</p>
              <div className="space-y-1.5">
                {ev.criteria.map((c, i) => {
                  const m = LEVEL_META[c.level] || LEVEL_META.not_assessed;
                  const Icon = m.icon;
                  return (
                    <div key={i} className="flex items-start justify-between gap-3 rounded-lg border p-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{c.criterion}</p>
                        {c.note && <p className="text-xs text-muted-foreground">{c.note}</p>}
                      </div>
                      <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium', m.cls)}>
                        <Icon className="size-3" /> {m.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* transcript */}
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Transcript</p>
            <ol className="space-y-3">
              {pairs.map((p, i) => (
                <li key={i} className="rounded-lg border p-3">
                  <div className="flex items-start gap-2">
                    <Bot className="mt-0.5 size-4 shrink-0 text-blue-500" />
                    <p className="text-sm font-medium">{p.q}</p>
                  </div>
                  <div className="mt-2 flex items-start gap-2">
                    <User className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {p.a || <span className="italic">No answer</span>}
                      {p.mode && (
                        <Badge variant="secondary" className="ml-2 align-middle text-[9px] font-normal">
                          {p.mode}
                        </Badge>
                      )}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
