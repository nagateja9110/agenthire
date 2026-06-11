'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { Input, Label, FieldError } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

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
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardContent className="pt-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">AgentHire</p>
          <h1 className="mt-1 text-xl font-bold">
            {isSignup ? 'Create your recruiter account' : 'Welcome back'}
          </h1>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            {isSignup && (
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" placeholder="Jane Recruiter" {...register('name')} />
                <FieldError>{errors.name?.message}</FieldError>
              </div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@company.com" {...register('email')} />
              <FieldError>{errors.email?.message}</FieldError>
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="********" {...register('password')} />
              <FieldError>{errors.password?.message}</FieldError>
            </div>
            {serverError && <p className="text-sm text-red-600">{serverError}</p>}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Spinner className="text-white" />}
              {isSignup ? 'Sign up' : 'Log in'}
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-zinc-500">
            {isSignup ? 'Already have an account? ' : 'New to AgentHire? '}
            <Link className="font-medium text-zinc-900 underline" href={isSignup ? '/login' : '/signup'}>
              {isSignup ? 'Log in' : 'Create an account'}
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
