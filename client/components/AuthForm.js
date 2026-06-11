'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { FieldError } from '@/components/status-badge';

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

const BRAND_POINTS = [
  'Seven cooperating AI agents score every resume',
  'Workflows pause for your approval - always',
  'Live React Flow canvas of each execution',
  'Every threshold traceable to a spec file',
];

export default function AuthForm({ mode }) {
  const isSignup = mode === 'signup';
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(isSignup ? signupSchema : loginSchema) });

  async function onSubmit(values) {
    setServerError('');
    try {
      const data = await api(`/auth/${isSignup ? 'signup' : 'login'}`, {
        method: 'POST',
        body: values,
      });
      setSession(data);
      router.push('/dashboard');
    } catch (err) {
      setServerError(err.message);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* brand panel */}
      <div className="relative hidden overflow-hidden bg-zinc-950 text-zinc-50 lg:block dark:border-r">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(oklch(1 0 0 / 0.13) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-[radial-gradient(circle,oklch(0.546_0.245_262.881/0.35),transparent_70%)]" />
        <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-[radial-gradient(circle,oklch(0.627_0.265_303.9/0.25),transparent_70%)]" />

        <div className="relative flex h-full flex-col justify-between p-10">
          <Link href="/" className="text-lg font-bold tracking-tight">
            Agent<span className="text-blue-400">Hire</span>
          </Link>

          <div>
            <h2 className="max-w-md text-3xl leading-snug font-bold text-balance">
              The recruiter console where AI does the screening and you make the call.
            </h2>
            <ul className="mt-8 space-y-3">
              {BRAND_POINTS.map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-sm text-zinc-300">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                  {point}
                </li>
              ))}
            </ul>
          </div>

          <p className="font-mono text-[11px] text-zinc-500">
            resume_parser → embedding → matching → shortlisting → human_approval → interview → email
          </p>
        </div>
      </div>

      {/* form panel */}
      <div className="relative flex items-center justify-center px-6 py-12">
        <div className="dot-grid pointer-events-none absolute inset-0 lg:hidden" />
        <div className="relative w-full max-w-sm">
          <Link href="/" className="text-base font-bold tracking-tight lg:hidden">
            Agent<span className="text-blue-600 dark:text-blue-400">Hire</span>
          </Link>

          <h1 className="mt-6 text-2xl font-bold tracking-tight lg:mt-0">
            {isSignup ? 'Create your recruiter account' : 'Welcome back'}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {isSignup
              ? 'Free to try - the demo runs without any API keys.'
              : 'Log in to your recruiter console.'}
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
            {isSignup && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" placeholder="Jane Recruiter" {...register('name')} />
                <FieldError>{errors.name?.message}</FieldError>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@company.com" {...register('email')} />
              <FieldError>{errors.email?.message}</FieldError>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" {...register('password')} />
              <FieldError>{errors.password?.message}</FieldError>
            </div>

            {serverError && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {serverError}
              </p>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting ? (
                <Spinner className="text-primary-foreground" />
              ) : (
                <>
                  {isSignup ? 'Create account' : 'Log in'} <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isSignup ? 'Already have an account? ' : 'New to AgentHire? '}
            <Link
              className="font-medium text-foreground underline underline-offset-4 hover:text-blue-600 dark:hover:text-blue-400"
              href={isSignup ? '/login' : '/signup'}
            >
              {isSignup ? 'Log in' : 'Create an account'}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
