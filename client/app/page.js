'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Bot, Workflow, FileSearch, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';

const FEATURES = [
  { icon: Bot, title: '7 cooperating agents', text: 'Parser, embeddings, matching, shortlisting, approval, interview, email.' },
  { icon: Workflow, title: 'LangGraph orchestration', text: 'Retries, checkpoints, resumability and a live React Flow canvas.' },
  { icon: FileSearch, title: 'RAG intelligence', text: 'Qdrant-backed retrieval over resumes and hiring policies.' },
  { icon: ShieldCheck, title: 'Human approval', text: 'Every AI decision pauses for recruiter sign-off before emails go out.' },
];

export default function Home() {
  const { token, hydrated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (hydrated && token) router.replace('/dashboard');
  }, [hydrated, token, router]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-20">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">AgentHire</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">
          The AI recruitment agent platform
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-zinc-600">
          Candidates apply with a resume. A LangGraph workflow parses, embeds, scores and
          shortlists them - then waits for your approval before inviting them to interview.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/signup"><Button size="lg">Get started as a recruiter</Button></Link>
          <Link href="/login"><Button size="lg" variant="outline">Log in</Button></Link>
        </div>
      </div>

      <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <Icon className="h-5 w-5 text-zinc-700" />
            <h3 className="mt-3 text-sm font-semibold">{title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">{text}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
