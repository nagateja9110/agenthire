'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Sparkles, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { FieldError } from '@/components/status-badge';

const schema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Describe the role in at least 10 characters'),
  required_skills: z.string().min(1, 'At least one required skill'),
  preferred_skills: z.string().optional().default(''),
  min_experience: z.coerce.number().min(0).max(50),
});

const parseSkills = (value) =>
  [...new Set(String(value || '').split(',').map((s) => s.trim()).filter(Boolean))];

const WORKFLOW_STEPS = ['parse', 'embed', 'match', 'shortlist', 'your approval', 'interview', 'email'];

export default function CreateJobPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      title: 'Frontend Developer',
      description: '',
      required_skills: 'React, JavaScript, CSS',
      preferred_skills: 'Next.js, Tailwind CSS',
      min_experience: 1,
    },
  });

  const requiredPreview = parseSkills(watch('required_skills'));
  const preferredPreview = parseSkills(watch('preferred_skills'));

  async function onSubmit(values) {
    setServerError('');
    try {
      await api('/jobs', {
        method: 'POST',
        body: {
          title: values.title,
          description: values.description,
          required_skills: parseSkills(values.required_skills),
          preferred_skills: parseSkills(values.preferred_skills),
          min_experience: values.min_experience,
        },
      });
      toast.success('Job created', { description: 'Copy the public apply link from the jobs list.' });
      router.push('/dashboard/jobs');
    } catch (err) {
      setServerError(err.message);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <button
          onClick={() => router.back()}
          className="mb-3 inline-flex cursor-pointer items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Back
        </button>
        <h1 className="text-2xl font-bold tracking-tight">Create job</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Applicants run through the hiring workflow automatically:
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {WORKFLOW_STEPS.map((step, i) => (
            <span key={step} className="flex items-center gap-1">
              <code
                className={`rounded-md border px-1.5 py-0.5 text-[10px] ${
                  step === 'your approval'
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {step}
              </code>
              {i < WORKFLOW_STEPS.length - 1 && <span className="text-muted-foreground/40">→</span>}
            </span>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Job details</CardTitle>
          <CardDescription>Matching scores candidates against these exact skills.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input id="title" {...register('title')} />
              <FieldError>{errors.title?.message}</FieldError>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={4}
                placeholder="What will this person build? What does success look like?"
                {...register('description')}
              />
              <FieldError>{errors.description?.message}</FieldError>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="required_skills">Required skills</Label>
              <Input id="required_skills" placeholder="Comma separated" {...register('required_skills')} />
              <FieldError>{errors.required_skills?.message}</FieldError>
              {requiredPreview.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {requiredPreview.map((s) => (
                    <Badge key={s} variant="secondary" className="font-normal">{s}</Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="preferred_skills">
                Preferred skills <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input id="preferred_skills" placeholder="Comma separated" {...register('preferred_skills')} />
              {preferredPreview.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {preferredPreview.map((s) => (
                    <Badge
                      key={s}
                      variant="outline"
                      className="border-blue-500/30 bg-blue-500/5 font-normal text-blue-600 dark:text-blue-400"
                    >
                      <Sparkles className="size-3" /> {s}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="min_experience">Minimum experience (years)</Label>
              <Input
                id="min_experience"
                type="number"
                min="0"
                step="0.5"
                className="max-w-32"
                {...register('min_experience')}
              />
              <FieldError>{errors.min_experience?.message}</FieldError>
            </div>

            {serverError && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {serverError}
              </p>
            )}

            <div className="flex gap-2 border-t pt-5">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Spinner className="text-primary-foreground" />} Create job
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
