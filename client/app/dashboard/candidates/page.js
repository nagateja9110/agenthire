'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Users } from 'lucide-react';
import { api } from '@/lib/api';
import { timeAgo, initials, scoreColor, cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatusBadge } from '@/components/status-badge';
import { PageLoader } from '@/components/ui/spinner';

const STATUSES = ['all', 'applied', 'processing', 'shortlisted', 'hold', 'rejected', 'invited'];

function ScoreCell({ score }) {
  if (score == null) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : 'bg-red-500'
          )}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={cn('text-sm font-semibold tabular-nums', scoreColor(score))}>{score}</span>
    </div>
  );
}

function CandidatesView() {
  const searchParams = useSearchParams();
  const jobFilter = searchParams.get('job');
  const [candidates, setCandidates] = useState(null);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams({ limit: '100' });
    if (filter !== 'all') params.set('status', filter);
    if (jobFilter) params.set('job_id', jobFilter);
    api(`/candidates?${params}`)
      .then((data) => setCandidates(data.items))
      .catch((err) => setError(err.message));
  }, [filter, jobFilter]);

  if (error) return <p className="py-10 text-sm text-destructive">{error}</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Candidates</h1>
        <p className="text-sm text-muted-foreground">
          Everyone who applied to your jobs, scored by the matching agent.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              'cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-all',
              filter === s
                ? 'border-foreground bg-foreground text-background shadow-sm'
                : 'bg-card text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            {s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {!candidates ? (
        <PageLoader label="Loading candidates..." />
      ) : candidates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl border bg-muted">
              <Users className="size-5 text-muted-foreground" />
            </div>
            <p className="mt-4 text-sm font-medium">
              No candidates {filter !== 'all' ? `with status "${filter.replace(/_/g, ' ')}"` : 'yet'}
            </p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              Share a job&apos;s public apply link - applications appear here in real time.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="py-0">
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5">Candidate</TableHead>
                  <TableHead>Job</TableHead>
                  <TableHead>Match score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-5 text-right">Applied</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.map((c) => (
                  <TableRow key={c._id}>
                    <TableCell className="pl-5">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarFallback className="bg-gradient-to-br from-blue-500/15 to-violet-500/15 text-[10px] font-semibold">
                            {initials(c.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{c.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.job_id?.title || '—'}</TableCell>
                    <TableCell>
                      <ScoreCell score={c.match_score} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={c.status} />
                    </TableCell>
                    <TableCell className="pr-5 text-right text-xs text-muted-foreground">
                      {timeAgo(c.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function CandidatesPage() {
  return (
    <Suspense fallback={<PageLoader label="Loading candidates..." />}>
      <CandidatesView />
    </Suspense>
  );
}
