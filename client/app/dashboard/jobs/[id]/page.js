'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Copy, ExternalLink, Clock, Users, Sparkles, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { cn, initials, scoreColor, timeAgo } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

const STATUSES = ['all', 'applied', 'processing', 'shortlisted', 'hold', 'invited', 'interviewed', 'rejected'];
const ACTIVE = ['applied', 'processing'];

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

export default function JobPipelinePage() {
  const { id } = useParams();
  const router = useRouter();
  const [job, setJob] = useState(null);
  const [candidates, setCandidates] = useState(null);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [jobRes, candRes] = await Promise.all([
        api(`/jobs/${id}`),
        api(`/candidates?job_id=${id}&limit=100`),
      ]);
      setJob(jobRes.job);
      setCandidates(candRes.items);
      setError('');
      return candRes.items;
    } catch (err) {
      setError(err.message);
      return [];
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Poll while any candidate is still being processed.
  const candRef = useRef(null);
  candRef.current = candidates;
  useEffect(() => {
    const t = setInterval(() => {
      const items = candRef.current;
      if (items && items.some((c) => ACTIVE.includes(c.status))) load();
    }, 3000);
    return () => clearInterval(t);
  }, [load]);

  async function copyLink() {
    await navigator.clipboard.writeText(`${window.location.origin}/jobs/${id}`);
    toast.success('Public job link copied');
  }

  if (error) return <p className="py-10 text-sm text-destructive">{error}</p>;
  if (!job || !candidates) return <PageLoader label="Loading candidates..." />;

  const counts = candidates.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {});
  const needsApproval = (counts.shortlisted || 0) + (counts.hold || 0);
  const visible = filter === 'all' ? candidates : candidates.filter((c) => c.status === filter);

  return (
    <div className="space-y-6">
      {/* header */}
      <div>
        <Link
          href="/dashboard/jobs"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> All jobs
        </Link>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{job.title}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Users className="size-3.5" /> {candidates.length} candidate
                {candidates.length === 1 ? '' : 's'}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3.5" /> {job.min_experience}+ yrs
              </span>
              {needsApproval > 0 && (
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-medium text-amber-600 dark:text-amber-400">
                  {needsApproval} awaiting your approval
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={copyLink}>
              <Copy className="size-3.5" /> Copy link
            </Button>
            <Link href={`/jobs/${id}`} target="_blank">
              <Button variant="outline" size="sm">
                <ExternalLink className="size-3.5" /> Public page
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {job.required_skills?.map((s) => (
            <Badge key={s} variant="secondary" className="font-normal">{s}</Badge>
          ))}
          {job.preferred_skills?.map((s) => (
            <Badge key={s} variant="outline" className="border-blue-500/30 bg-blue-500/5 font-normal text-blue-600 dark:text-blue-400">
              <Sparkles className="size-3" /> {s}
            </Badge>
          ))}
        </div>
      </div>

      {/* status filter chips (with per-status counts) */}
      <div className="flex flex-wrap gap-1.5">
        {STATUSES.map((s) => {
          const n = s === 'all' ? candidates.length : counts[s] || 0;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn(
                'inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all',
                filter === s
                  ? 'border-foreground bg-foreground text-background shadow-sm'
                  : 'bg-card text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              {s.replace(/_/g, ' ')}
              <span
                className={cn(
                  'rounded-full px-1 text-[10px]',
                  filter === s ? 'bg-background/20' : 'bg-muted'
                )}
              >
                {n}
              </span>
            </button>
          );
        })}
      </div>

      {/* candidate table for this job */}
      {visible.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl border bg-muted">
              <Users className="size-5 text-muted-foreground" />
            </div>
            <p className="mt-4 text-sm font-medium">
              {candidates.length === 0
                ? 'No candidates yet'
                : `No candidates with status "${filter.replace(/_/g, ' ')}"`}
            </p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              {candidates.length === 0
                ? "Share this job's public link - applications appear here in real time."
                : 'Try a different filter.'}
            </p>
            {candidates.length === 0 && (
              <Button size="sm" className="mt-4" onClick={copyLink}>
                <Copy className="size-3.5" /> Copy public link
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="py-0">
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5">Candidate</TableHead>
                  <TableHead>Match score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Applied</TableHead>
                  <TableHead className="w-8 pr-5" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((c) => (
                  <TableRow
                    key={c._id}
                    onClick={() => router.push(`/dashboard/candidates/${c._id}`)}
                    className="group cursor-pointer"
                  >
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
                    <TableCell>
                      <ScoreCell score={c.match_score} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={c.status} />
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {timeAgo(c.created_at)}
                    </TableCell>
                    <TableCell className="pr-5">
                      <ChevronRight className="size-4 text-muted-foreground/40 transition-colors group-hover:text-foreground" />
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
