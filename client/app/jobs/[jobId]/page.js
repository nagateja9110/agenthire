'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Briefcase, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { PageLoader } from '@/components/ui/spinner';

export default function PublicJobPage() {
  const { jobId } = useParams();
  const [job, setJob] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/jobs/${jobId}`)
      .then((data) => setJob(data.job))
      .catch((err) => setError(err.message));
  }, [jobId]);

  if (error)
    return (
      <main className="mx-auto max-w-2xl px-4 py-20 text-center text-sm text-red-600">{error}</main>
    );
  if (!job) return <PageLoader label="Loading job..." />;

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
        AgentHire · Open position
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">{job.title}</h1>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-zinc-500">
        <span className="inline-flex items-center gap-1.5">
          <Briefcase className="h-4 w-4" /> Full-time
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-4 w-4" /> {job.min_experience}+ years experience
        </span>
      </div>

      <Card className="mt-6">
        <CardContent className="pt-4">
          <h2 className="text-sm font-semibold">About the role</h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-zinc-600">
            {job.description}
          </p>

          <h2 className="mt-5 text-sm font-semibold">Required skills</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {job.required_skills.map((s) => (
              <Badge key={s} className="border-zinc-200 bg-zinc-100 text-zinc-700">{s}</Badge>
            ))}
          </div>

          {job.preferred_skills.length > 0 && (
            <>
              <h2 className="mt-5 text-sm font-semibold">Nice to have</h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {job.preferred_skills.map((s) => (
                  <Badge key={s} className="border-blue-100 bg-blue-50 text-blue-700">{s}</Badge>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="mt-6">
        <Link href={`/jobs/${jobId}/apply`}>
          <Button size="lg" className="w-full sm:w-auto">Apply for this position</Button>
        </Link>
        <p className="mt-2 text-xs text-zinc-400">
          Your resume is evaluated by our AI hiring workflow and reviewed by a human recruiter.
        </p>
      </div>
    </main>
  );
}
