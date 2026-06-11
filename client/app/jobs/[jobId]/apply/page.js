'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FileText, UploadCloud, CheckCircle2, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input, Label, FieldError } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner, PageLoader } from '@/components/ui/spinner';
import { StatusBadge } from '@/components/ui/badge';

const schema = z.object({
  name: z.string().min(2, 'Enter your full name'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().min(7, 'Enter a valid phone number'),
});

const MAX_SIZE = 5 * 1024 * 1024;

export default function ApplyPage() {
  const { jobId } = useParams();
  const [job, setJob] = useState(null);
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [serverError, setServerError] = useState('');
  const [phase, setPhase] = useState('form'); // form | submitting | done
  const [result, setResult] = useState(null);
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

  function onFileChange(e) {
    const selected = e.target.files?.[0] || null;
    setFileError('');
    if (selected && selected.type !== 'application/pdf') {
      setFileError('Only PDF files are accepted');
      setFile(null);
      return;
    }
    if (selected && selected.size > MAX_SIZE) {
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
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
        <h1 className="mt-4 text-2xl font-bold">Application submitted!</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Thanks for applying to <strong>{job.title}</strong>. Our AI hiring workflow has already
          started processing your resume.
        </p>
        <Card className="mt-6 text-left">
          <CardContent className="space-y-2 pt-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Workflow status</span>
              <StatusBadge status={result.workflow_status} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Current step</span>
              <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs">
                {result.current_state || 'starting...'}
              </code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Reference id</span>
              <code className="text-xs text-zinc-400">{result.workflow_id}</code>
            </div>
          </CardContent>
        </Card>
        <p className="mt-4 text-xs text-zinc-400">
          A recruiter reviews every AI decision. You&apos;ll hear from us by email.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <Link href={`/jobs/${jobId}`} className="text-xs text-zinc-500 hover:text-zinc-800">
        ← Back to job
      </Link>
      <h1 className="mt-2 text-2xl font-bold">Apply: {job?.title}</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Submit your details and a PDF resume. Processing starts immediately.
      </p>

      <Card className="mt-6">
        <CardContent className="pt-5">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="name">Full name</Label>
              <Input id="name" placeholder="John Doe" {...register('name')} />
              <FieldError>{errors.name?.message}</FieldError>
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="john@example.com" {...register('email')} />
              <FieldError>{errors.email?.message}</FieldError>
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" placeholder="+91 98765 43210" {...register('phone')} />
              <FieldError>{errors.phone?.message}</FieldError>
            </div>

            <div>
              <Label>Resume (PDF, max 5 MB)</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={onFileChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-1 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-sm text-zinc-500 transition-colors hover:border-zinc-400 hover:bg-zinc-100"
              >
                {file ? (
                  <>
                    <FileText className="h-5 w-5 text-zinc-700" />
                    <span className="font-medium text-zinc-800">{file.name}</span>
                    <span className="text-xs text-zinc-400">
                      ({(file.size / 1024).toFixed(0)} KB)
                    </span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-5 w-5" /> Click to choose your PDF resume
                  </>
                )}
              </button>
              <FieldError>{fileError}</FieldError>
            </div>

            {serverError && <p className="text-sm text-red-600">{serverError}</p>}

            <Button type="submit" className="w-full" size="lg" disabled={phase === 'submitting'}>
              {phase === 'submitting' ? (
                <>
                  <Spinner className="text-white" /> Uploading & starting AI workflow...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Submit application
                </>
              )}
            </Button>

            {phase === 'submitting' && (
              <p className="text-center text-xs text-zinc-400">
                Parsing your resume and starting the hiring workflow - this takes a few seconds.
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
