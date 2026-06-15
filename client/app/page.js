'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import {
  Bot,
  Workflow,
  FileSearch,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  FileText,
  Braces,
  Target,
  ListChecks,
  UserCheck,
  MessagesSquare,
  Mail,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';

const PIPELINE = [
  { icon: FileText, label: 'Parse' },
  { icon: Braces, label: 'Embed' },
  { icon: Target, label: 'Match' },
  { icon: ListChecks, label: 'Shortlist' },
  { icon: UserCheck, label: 'Approve' },
  { icon: MessagesSquare, label: 'Interview' },
  { icon: Mail, label: 'Email' },
];

const FEATURES = [
  {
    icon: Bot,
    title: '7 cooperating agents',
    text: 'Resume parser, embeddings, matching, shortlisting, human approval, interview and email agents - each traceable in the logs.',
  },
  {
    icon: Workflow,
    title: 'LangGraph orchestration',
    text: 'MongoDB-checkpointed runs with retries, resumability and a live React Flow canvas of every execution.',
  },
  {
    icon: FileSearch,
    title: 'RAG intelligence',
    text: 'bge-small embeddings in Qdrant retrieve hiring policy context for every matching decision.',
  },
  {
    icon: ShieldCheck,
    title: 'Human-in-the-loop',
    text: 'Every AI decision pauses at a checkpoint for recruiter sign-off before a single email goes out.',
  },
];

export default function Home() {
  const { token, hydrated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (hydrated && token) router.replace('/dashboard');
  }, [hydrated, token, router]);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* backdrop */}
      <div className="dot-grid pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-130 w-225 -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,oklch(0.546_0.245_262.881/0.14),transparent_65%)]" />

      {/* nav */}
      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="AgentHire logo" width={30} height={30} className="rounded-md" priority />
          <span className="text-lg font-bold tracking-tight">
            Agent<span className="text-blue-600 dark:text-blue-400">Hire</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login">
            <Button variant="ghost" size="sm">Log in</Button>
          </Link>
          <Link href="/signup">
            <Button size="sm">
              Get started <ArrowRight className="size-3.5" />
            </Button>
          </Link>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-6 pt-16 pb-24">
        {/* hero */}
        <div className="mx-auto max-w-3xl text-center">
          <div
            className="animate-fade-up mx-auto inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur"
            style={{ animationDelay: '0ms' }}
          >
            <Sparkles className="size-3.5 text-blue-500" />
            Spec-driven · LangGraph · RAG · Human approval
          </div>

          <h1
            className="animate-fade-up mt-6 text-5xl leading-[1.08] font-bold tracking-tight text-balance sm:text-6xl"
            style={{ animationDelay: '80ms' }}
          >
            Hiring decisions,{' '}
            <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent dark:from-blue-400 dark:via-violet-400 dark:to-fuchsia-400">
              orchestrated by agents
            </span>
          </h1>

          <p
            className="animate-fade-up mx-auto mt-5 max-w-2xl text-lg text-pretty text-muted-foreground"
            style={{ animationDelay: '160ms' }}
          >
            Candidates apply with a resume. Seven AI agents parse, embed, score and shortlist them
            - then wait for your approval before inviting anyone to interview.
          </p>

        </div>

        {/* pipeline strip */}
        <div
          className="animate-fade-up mx-auto mt-16 max-w-4xl rounded-2xl border bg-card/70 p-5 shadow-sm backdrop-blur"
          style={{ animationDelay: '320ms' }}
        >
          <p className="text-center text-[11px] font-medium tracking-widest text-muted-foreground uppercase">
            The hiring workflow
          </p>
          <div className="mt-4 flex items-center justify-between gap-1 overflow-x-auto pb-1">
            {PIPELINE.map(({ icon: Icon, label }, i) => (
              <div key={label} className="flex shrink-0 items-center">
                <div className="flex flex-col items-center gap-1.5 px-1.5">
                  <div
                    className="flex size-10 items-center justify-center rounded-xl border bg-background shadow-sm"
                    style={{
                      animation: 'pulse-dot 2.8s ease-in-out infinite',
                      animationDelay: `${i * 0.35}s`,
                    }}
                  >
                    <Icon className="size-4.5 text-foreground/70" />
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
                </div>
                {i < PIPELINE.length - 1 && (
                  <ArrowRight className="mx-0.5 size-3.5 shrink-0 text-muted-foreground/40" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* features */}
        <div className="stagger mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="hover-lift group rounded-xl border bg-card p-5 shadow-sm"
            >
              <div className="flex size-9 items-center justify-center rounded-lg border bg-gradient-to-b from-background to-muted shadow-sm">
                <Icon className="size-4.5 text-foreground/80 transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400" />
              </div>
              <h3 className="mt-4 text-sm font-semibold">{title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>

        {/* footer strip */}
        <footer className="mt-20 flex flex-col items-center justify-between gap-3 border-t pt-6 text-xs text-muted-foreground sm:flex-row">
          <span>AgentHire - every hiring rule traceable to a spec file.</span>
          <span className="font-mono">Next.js 15 · Express · LangGraph · Qdrant · MongoDB</span>
        </footer>
      </main>
    </div>
  );
}
