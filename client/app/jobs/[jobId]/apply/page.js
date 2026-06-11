'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FileText, UploadCloud, CheckCircle2, Sparkles, ArrowLeft, X } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner, PageLoader } from '@/components/ui/spinner';
import { StatusBadge, FieldError } from '@/components/status-badge';
import { ThemeToggle } from '@/components/theme-toggle';

const schema = z.object({
  name: z.string().min(2, 'Enter your full name'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().min(7, 'Enter a valid phone number'),
});

const MAX_SIZE = 5 * 1024 * 1024;

const PIPELINE_PREVIEW = ['parse', 'embed', 'match', 'shortlist', 'review', 'decision'];

export default function ApplyPage() {
  const { jobId } = useParams();
  const [job, setJob] = useState(null);
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [serverError, setServerError] = useState('');
  const [phase, setPhase] = useState('form'); // form | submitting | done
  const [result, setResult] = useState(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  useEffect(() => {
    api(`/jobs/${jobId}`)
      .then((data) => setJob(data.job))
      .catch((err) => setServerError(err.message));
  }, [jobId]);

  function acceptFile(selected) {
    setFileError('');
    if (!selected) return;
    if (selected.type !== 'application/pdf') {
      setFileError('Only PDF files are accepted');
      setFile(null);
      return;
    }
    if (selected.size > MAX_SIZE) {
      setFileError('Resume must be 5 MB or smaller');
      setFile(null);
      return;
    }
    setFile(selected);
  }

  async function onSubmit(values) {
    if (!file) {
      setFileError('Attach your resume (PDF)');
      return;
    }
    setServerError('');
    setPhase('submitting');
    try {
      const formData = new FormData();
      formData.append('job_id', jobId);
      formData.append('name', values.name);
      formData.append('email', values.email);
      formData.append('phone', values.phone);
      formData.append('resume', file);
      const data = await api('/candidates/upload', { method: 'POST', formData });
      setResult(data);
      setPhase('done');
    } catch (err) {
      setServerError(
        err.status === 409 ? 'You have already applied to this job with this email.' : err.message
      );
      setPhase('form');
    }
  }

  if (!job && !serverError) return <PageLoader label="Loading application..." />;

  if (phase === 'done' && result) {
    return (
      <div className="relative min-h-screen">
        <div className="dot-grid pointer-events-none absolute inset-0" />
        <main className="animate-scale-in relative mx-auto max-w-xl px-4 py-20 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
            <CheckCircle2 className="size-8 text-emerald-500" />
          </div>
          <h1 className="mt-5 text-3xl font-bold tracking-tight">Application submitted!</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Thanks for applying to <strong className="text-foreground">{job.title}</strong>. Our AI
            hiring workflow is already processing your resume.
          </p>

          <Card className="mt-8 text-left">
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Workflow status</span>
                <StatusBadge status={result.workflow_status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Current step</span>
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                  {result.current_state || 'starting...'}
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Reference id</span>
                <code className="font-mono text-[11px] text-muted-foreground">
                  {result.workflow_id}
                </code>
              </div>
              <div className="border-t pt-3">
                <div className="flex items-center justify-between gap-1">
                  {PIPELINE_PREVIEW.map((step, i) => (
                    <div key={step} className="flex flex-1 flex-col items-center gap-1">
                      <div
                        className={cn(
                          'h-1 w-full rounded-full',
                          i === 0 ? 'animate-pulse-dot bg-blue-500' : 'bg-muted'
                        )}
                      />
                      <span className="text-[9px] text-muted-foreground">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <p className="mt-5 text-xs text-muted-foreground">
            A human recruiter reviews every AI decision. You&apos;ll hear from us by email.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <div className="dot-grid pointer-events-none absolute inset-0" />

      <header className="relative mx-auto flex max-w-xl items-center justify-between px-4 py-5">
        <Link
          href={`/jobs/${jobId}`}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Back to job
        </Link>
        <ThemeToggle />
      </header>

      <main className="relative mx-auto max-w-xl px-4 pb-16">
        <h1 className="text-3xl font-bold tracking-tight">Apply: {job?.title}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Submit your details and a PDF resume - AI processing starts immediately, and a human
          reviews every decision.
        </p>

        <Card className="mt-6">
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" placeholder="John Doe" {...register('name')} />
                <FieldError>{errors.name?.message}</FieldError>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="john@example.com" {...register('email')} />
                  <FieldError>{errors.email?.message}</FieldError>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" placeholder="+91 98765 43210" {...register('phone')} />
                  <FieldError>{errors.phone?.message}</FieldError>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Resume</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => acceptFile(e.target.files?.[0] || null)}
                />
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    acceptFile(e.dataTransfer.files?.[0] || null);
                  }}
                  className={cn(
                    'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-sm transition-all',
                    dragging
                      ? 'scale-[1.01] border-blue-500 bg-blue-500/5'
                      : file
                        ? 'border-emerald-500/40 bg-emerald-500/5'
                        : 'border-border bg-muted/40 hover:border-muted-foreground/40 hover:bg-muted/70'
                  )}
                >
                  {file ? (
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10">
                        <FileText className="size-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024).toFixed(0)} KB · PDF
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                        }}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex size-10 items-center justify-center rounded-lg border bg-background shadow-sm">
                        <UploadCloud className="size-5 text-muted-foreground" />
                      </div>
                      <p className="font-medium">
                        Drop your resume here or{' '}
                        <span className="text-blue-600 dark:text-blue-400">browse</span>
                      </p>
                      <p className="text-xs text-muted-foreground">PDF only · max 5 MB</p>
                    </>
                  )}
                </div>
                <FieldError>{fileError}</FieldError>
              </div>

              {serverError && (
                <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {serverError}
                </p>
              )}

              <Button type="submit" className="w-full" size="lg" disabled={phase === 'submitting'}>
                {phase === 'submitting' ? (
                  <>
                    <Spinner className="text-primary-foreground" /> Uploading & starting AI workflow...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" /> Submit application
                  </>
                )}
              </Button>

              {phase === 'submitting' && (
                <p className="text-center text-xs text-muted-foreground">
                  Parsing your resume and starting the hiring workflow - this takes a few seconds.
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
