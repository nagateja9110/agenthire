'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Copy, Check, ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageLoader } from '@/components/ui/spinner';

export default function JobsPage() {
  const [jobs, setJobs] = useState(null);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    api('/jobs?mine=true&limit=100')
      .then((data) => setJobs(data.items))
      .catch((err) => setError(err.message));
  }, []);

  async function copyLink(jobId) {
    await navigator.clipboard.writeText(`${window.location.origin}/jobs/${jobId}/apply`);
    setCopiedId(jobId);
    setTimeout(() => setCopiedId(null), 1500);
  }

  if (!jobs && !error) return <PageLoader label="Loading jobs..." />;
  if (error) return <p className="py-10 text-sm text-red-600">{error}</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Jobs</h1>
          <p className="text-sm text-zinc-500">Share the public apply link with candidates.</p>
        </div>
        <Link href="/dashboard/jobs/create">
          <Button>
            <Plus className="h-4 w-4" /> Create job
          </Button>
        </Link>
      </div>

      {jobs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-zinc-400">
            No jobs yet. Create your first job to get a public apply link.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {jobs.map((job) => (
            <Card key={job._id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{job.title}</h3>
                    <p className="text-xs text-zinc-500">
                      Created {formatDate(job.created_at)} · min {job.min_experience} yr exp
                    </p>
                  </div>
                  <Link href={`/jobs/${job._id}`} target="_blank">
                    <Button variant="ghost" size="sm" title="Open public job page">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>

                <p className="mt-2 line-clamp-2 text-sm text-zinc-600">{job.description}</p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {job.required_skills.map((s) => (
                    <Badge key={s} className="border-zinc-200 bg-zinc-100 text-zinc-700">
                      {s}
                    </Badge>
                  ))}
                  {job.preferred_skills.map((s) => (
                    <Badge key={s} className="border-blue-100 bg-blue-50 text-blue-700">
                      {s}
                    </Badge>
                  ))}
                </div>

                <div className="mt-4">
                  <Button variant="outline" size="sm" onClick={() => copyLink(job._id)}>
                    {copiedId === job._id ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" /> Copy public apply link
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
