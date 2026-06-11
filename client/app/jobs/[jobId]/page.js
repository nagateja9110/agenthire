'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Briefcase, Clock, Sparkles, ArrowRight, Bot, ShieldCheck, FileText } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme-toggle';
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
      <main className="mx-auto max-w-2xl px-4 py-20 text-center text-sm text-destructive">
        {error}
      </main>
    );
  if (!job) return <PageLoader label="Loading job..." />;

  return (
    <div className="relative min-h-screen">
      <div className="dot-grid pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-200 -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,oklch(0.546_0.245_262.881/0.12),transparent_65%)]" />

      <header className="relative mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
        <Link href="/" className="text-base font-bold tracking-tight">
          Agent<span className="text-blue-600 dark:text-blue-400">Hire</span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="relative mx-auto max-w-4xl px-6 pt-6 pb-20">
        <div className="animate-fade-up">
          <Badge variant="outline" className="bg-card/60 backdrop-blur">
            <span className="size-1.5 rounded-full bg-emerald-500" /> Open position
          </Badge>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-balance">{job.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Briefcase className="size-4" /> Full-time
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-4" /> {job.min_experience}+ years experience
            </span>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_280px]">
          <div className="animate-fade-up space-y-6" style={{ animationDelay: '80ms' }}>
            <Card>
              <CardContent>
                <h2 className="text-sm font-semibold">About the role</h2>
                <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
                  {job.description}
                </p>

                <h2 className="mt-6 text-sm font-semibold">Required skills</h2>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {job.required_skills.map((s) => (
                    <Badge key={s} variant="secondary" className="font-normal">{s}</Badge>
                  ))}
                </div>

                {job.preferred_skills.length > 0 && (
                  <>
                    <h2 className="mt-6 text-sm font-semibold">Nice to have</h2>
                    <div className="mt-2 flex flex-wrap gap-1.5">
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
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <h2 className="text-sm font-semibold">How your application is processed</h2>
                <ul className="mt-3 space-y-3">
                  {[
                    { icon: FileText, text: 'Your resume is parsed and scored against the exact skills above.' },
                    { icon: Bot, text: 'Seven AI agents evaluate your profile with full decision traceability.' },
                    { icon: ShieldCheck, text: 'A human recruiter reviews and approves every decision - no auto-rejects without oversight.' },
                  ].map(({ icon: Icon, text }) => (
                    <li key={text} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <Icon className="mt-0.5 size-4 shrink-0 text-blue-600 dark:text-blue-400" />
                      {text}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* sticky apply card */}
          <div className="animate-fade-up lg:sticky lg:top-6 lg:h-fit" style={{ animationDelay: '160ms' }}>
            <Card className="glass-card border-blue-500/20 shadow-lg shadow-blue-500/5">
              <CardContent>
                <h3 className="font-semibold">Ready to apply?</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Takes under a minute - just your details and a PDF resume.
                </p>
                <Link href={`/jobs/${jobId}/apply`} className="mt-4 block">
                  <Button className="w-full" size="lg">
                    Apply now <ArrowRight className="size-4" />
                  </Button>
                </Link>
                <p className="mt-3 text-center text-[11px] text-muted-foreground">
                  PDF only · max 5 MB
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
