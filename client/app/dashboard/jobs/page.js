'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Copy, ExternalLink, Briefcase, Clock, Sparkles, Users, ArrowRight, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageLoader } from '@/components/ui/spinner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

export default function JobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState(null);
  const [error, setError] = useState('');
  const [jobToDelete, setJobToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api('/jobs?mine=true&limit=100')
      .then((data) => setJobs(data.items))
      .catch((err) => setError(err.message));
  }, []);

  async function copyLink(jobId) {
    await navigator.clipboard.writeText(`${window.location.origin}/jobs/${jobId}`);
    toast.success('Public job link copied', {
      description: 'Candidates land on the job page, then click Apply now.',
    });
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await api(`/jobs/${jobToDelete._id}`, { method: 'DELETE' });
      setJobs((prev) => prev.filter((j) => j._id !== jobToDelete._id));
      toast.success('Job deleted');
      setJobToDelete(null);
    } catch (err) {
      toast.error('Failed to delete job', { description: err.message });
    } finally {
      setDeleting(false);
    }
  }

  if (!jobs && !error) return <PageLoader label="Loading jobs..." />;
  if (error) return <p className="py-10 text-sm text-destructive">{error}</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Jobs</h1>
          <p className="text-sm text-muted-foreground">
            Each job gets a public apply link that auto-starts the AI workflow.
          </p>
        </div>
        <Link href="/dashboard/jobs/create">
          <Button>
            <Plus className="size-4" /> Create job
          </Button>
        </Link>
      </div>

      {jobs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl border bg-muted">
              <Briefcase className="size-5 text-muted-foreground" />
            </div>
            <p className="mt-4 text-sm font-medium">No jobs yet</p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              Create your first job to get a public apply link you can share with candidates.
            </p>
            <Link href="/dashboard/jobs/create">
              <Button size="sm" className="mt-4">
                <Plus className="size-4" /> Create job
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="stagger grid gap-4 lg:grid-cols-2">
          {jobs.map((job) => {
            const total = job.stats?.total || 0;
            const byStatus = job.stats?.by_status || {};
            const needsApproval = (byStatus.shortlisted || 0) + (byStatus.hold || 0);
            return (
              <Card
                key={job._id}
                onClick={() => router.push(`/dashboard/jobs/${job._id}`)}
                className="hover-lift group relative cursor-pointer overflow-hidden"
              >
                <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-blue-500 to-violet-500 opacity-0 transition-opacity group-hover:opacity-100" />
                <CardContent>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold">{job.title}</h3>
                      <p className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Users className="size-3" /> {total} candidate{total === 1 ? '' : 's'}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="size-3" /> {job.min_experience}+ yrs
                        </span>
                        <span>created {timeAgo(job.created_at)}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/jobs/${job._id}`}
                        target="_blank"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button variant="ghost" size="icon" className="size-8" title="Open public job page">
                          <ExternalLink className="size-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        title="Delete job"
                        onClick={(e) => {
                          e.stopPropagation();
                          setJobToDelete(job);
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>

                  <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{job.description}</p>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {job.required_skills.map((s) => (
                      <Badge key={s} variant="secondary" className="font-normal">
                        {s}
                      </Badge>
                    ))}
                    {job.preferred_skills.map((s) => (
                      <Badge
                        key={s}
                        variant="outline"
                        className="border-blue-500/30 bg-blue-500/5 font-normal text-blue-600 dark:text-blue-400"
                      >
                        <Sparkles className="size-3" /> {s}
                      </Badge>
                    ))}
                  </div>

                  {needsApproval > 0 && (
                    <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                      {needsApproval} awaiting your approval
                    </div>
                  )}

                  <div className="mt-5 flex items-center justify-between border-t pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyLink(job._id);
                      }}
                    >
                      <Copy className="size-3.5" /> Copy apply link
                    </Button>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                      Open pipeline <ArrowRight className="size-3.5" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!jobToDelete} onOpenChange={(open) => !open && setJobToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this job?</DialogTitle>
            <DialogDescription>
              {jobToDelete && (
                <>
                  This permanently deletes <span className="font-medium">{jobToDelete.title}</span>,
                  its public apply link, and all candidates and workflow runs for this job. This
                  can&apos;t be undone.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJobToDelete(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete job'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
