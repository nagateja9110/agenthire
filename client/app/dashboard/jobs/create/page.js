'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Label, FieldError } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';

const schema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Describe the role in at least 10 characters'),
  required_skills: z.string().min(1, 'At least one required skill'),
  preferred_skills: z.string().optional().default(''),
  min_experience: z.coerce.number().min(0).max(50),
});

const parseSkills = (value) =>
  [...new Set(String(value || '').split(',').map((s) => s.trim()).filter(Boolean))];

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
      router.push('/dashboard/jobs');
    } catch (err) {
      setServerError(err.message);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold">Create job</h1>
        <p className="text-sm text-zinc-500">
          Candidates applying to this job run through the default hiring workflow:
          parse → embed → match → shortlist → your approval → interview → email.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Job details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input id="title" {...register('title')} />
              <FieldError>{errors.title?.message}</FieldError>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="What will this person build? What does success look like?"
                {...register('description')}
              />
              <FieldError>{errors.description?.message}</FieldError>
            </div>

            <div>
              <Label htmlFor="required_skills">Required skills (comma separated)</Label>
              <Input id="required_skills" {...register('required_skills')} />
              <FieldError>{errors.required_skills?.message}</FieldError>
              {requiredPreview.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {requiredPreview.map((s) => (
                    <Badge key={s} className="border-zinc-200 bg-zinc-100 text-zinc-700">{s}</Badge>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="preferred_skills">Preferred skills (comma separated)</Label>
              <Input id="preferred_skills" {...register('preferred_skills')} />
              {preferredPreview.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {preferredPreview.map((s) => (
                    <Badge key={s} className="border-blue-100 bg-blue-50 text-blue-700">{s}</Badge>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="min_experience">Minimum experience (years)</Label>
              <Input id="min_experience" type="number" min="0" step="0.5" {...register('min_experience')} />
              <FieldError>{errors.min_experience?.message}</FieldError>
            </div>

            {serverError && <p className="text-sm text-red-600">{serverError}</p>}

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Spinner className="text-white" />} Create job
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
