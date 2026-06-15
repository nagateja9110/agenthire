'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Mic,
  Square,
  Volume2,
  Send,
  CheckCircle2,
  Loader2,
  Keyboard,
  AlertTriangle,
  Bot,
  ThumbsUp,
  Lightbulb,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ThemeToggle } from '@/components/theme-toggle';
import { useTextToSpeech, useSpeechRecognition } from '@/hooks/useSpeech';

export default function InterviewPage() {
  const { token } = useParams();
  const [session, setSession] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [phase, setPhase] = useState('loading'); // loading | intro | asking | submitting | completing | done
  const [answer, setAnswer] = useState('');
  const [submitError, setSubmitError] = useState('');

  const tts = useTextToSpeech();
  const stt = useSpeechRecognition();
  const askedRef = useRef(-1);

  const loadSession = useCallback(async () => {
    try {
      const data = await api(`/interview/${token}`);
      setSession(data);
      if (data.completed || data.status === 'completed') setPhase('done');
      else if (data.status === 'expired') setLoadError('This interview link has expired.');
      else setPhase('intro');
    } catch (err) {
      setLoadError(err.message);
    }
  }, [token]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // Speak each new question once (keyed on the question text, since the
  // adaptive interview has no fixed index).
  useEffect(() => {
    if (phase !== 'asking' || !session?.current_question) return;
    const q = session.current_question.question;
    if (askedRef.current !== q) {
      askedRef.current = q;
      tts.speak(q);
    }
  }, [phase, session, tts]);

  // Keep the editable answer box in sync with live speech.
  useEffect(() => {
    if (stt.transcript) setAnswer(stt.transcript);
  }, [stt.transcript]);

  function beginInterview() {
    setPhase('asking');
  }

  function toggleMic() {
    setSubmitError('');
    if (stt.listening) {
      stt.stop();
    } else {
      tts.stop();
      stt.reset();
      setAnswer('');
      stt.start();
    }
  }

  async function submitAnswer() {
    if (!answer.trim()) {
      setSubmitError('Please record or type an answer first.');
      return;
    }
    stt.stop();
    tts.stop();
    setPhase('submitting');
    setSubmitError('');
    try {
      const res = await api(`/interview/${token}/answer`, {
        method: 'POST',
        body: { answer: answer.trim(), mode: stt.listening || answer === stt.transcript ? 'voice' : 'text' },
      });
      stt.reset();
      setAnswer('');
      if (res.done) {
        setPhase('completing');
        await api(`/interview/${token}/complete`, { method: 'POST' });
        // Re-fetch to pick up the candidate-safe feedback + answer recap.
        try {
          const finished = await api(`/interview/${token}`);
          setSession(finished);
        } catch {
          /* keep whatever we have */
        }
        setPhase('done');
      } else {
        setSession((s) => ({
          ...s,
          asked_count: res.asked_count,
          target_questions: res.target_questions ?? s.target_questions,
          current_question: res.current_question,
        }));
        setPhase('asking');
      }
    } catch (err) {
      setSubmitError(err.message);
      setPhase('asking');
    }
  }

  // ---- render states ----
  if (loadError) {
    return (
      <Shell>
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-10 text-center">
            <AlertTriangle className="size-8 text-amber-500" />
            <h1 className="mt-3 text-lg font-semibold">Interview unavailable</h1>
            <p className="mt-1 text-sm text-muted-foreground">{loadError}</p>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  if (phase === 'loading' || !session) {
    return (
      <Shell>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading your interview...
        </div>
      </Shell>
    );
  }

  if (phase === 'done') {
    const fb = session.feedback;
    const answers = session.answers || [];
    return (
      <Shell>
        <div className="w-full max-w-xl space-y-4">
          <Card className="animate-scale-in">
            <CardContent className="flex flex-col items-center py-8 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-emerald-500/15">
                <CheckCircle2 className="size-7 text-emerald-500" />
              </div>
              <h1 className="mt-4 text-xl font-bold">Interview complete</h1>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                Thank you{session.candidate_name ? `, ${session.candidate_name}` : ''}! Your responses
                for <strong>{session.job_title}</strong> have been shared with the recruiting team,
                who will make the final decision. You&apos;ll hear from us by email.
              </p>
            </CardContent>
          </Card>

          {fb && (fb.summary || fb.strengths?.length || fb.improvements?.length) && (
            <Card className="animate-fade-up">
              <CardContent className="space-y-4 py-5">
                <div className="flex items-center gap-2">
                  <Bot className="size-4 text-blue-500" />
                  <h2 className="text-sm font-semibold">Your feedback</h2>
                </div>
                {fb.summary && <p className="text-sm text-muted-foreground">{fb.summary}</p>}

                {fb.strengths?.length > 0 && (
                  <div>
                    <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <ThumbsUp className="size-3.5" /> Strengths
                    </p>
                    <ul className="space-y-1">
                      {fb.strengths.map((s, i) => (
                        <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                          <span className="text-emerald-500">•</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {fb.improvements?.length > 0 && (
                  <div>
                    <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                      <Lightbulb className="size-3.5" /> Areas to grow
                    </p>
                    <ul className="space-y-1">
                      {fb.improvements.map((s, i) => (
                        <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                          <span className="text-amber-500">•</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="border-t pt-3 text-[11px] text-muted-foreground">
                  This is general feedback to help you - the hiring decision is made by the recruiting
                  team after review.
                </p>
              </CardContent>
            </Card>
          )}

          {answers.length > 0 && (
            <Card className="animate-fade-up">
              <CardContent className="py-5">
                <h2 className="mb-3 text-sm font-semibold">Your answers</h2>
                <ol className="space-y-3">
                  {answers.map((a) => (
                    <li key={a.index} className="rounded-lg border p-3">
                      <p className="text-sm font-medium">{a.question}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {a.answer || <span className="italic">No answer</span>}
                      </p>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}
        </div>
      </Shell>
    );
  }

  const target = session.target_questions || 5;
  const idx = session.asked_count || 0;
  // Adaptive interview: cap visible progress below 100% until truly done.
  const progress = Math.min(Math.round((idx / target) * 100), 92);

  return (
    <Shell>
      <div className="w-full max-w-xl space-y-5">
        {/* progress */}
        <div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Question {idx + 1} <span className="text-muted-foreground/60">· ~{target} total</span>
            </span>
            <span>{session.job_title}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-500"
              style={{ width: `${phase === 'intro' ? 0 : progress}%` }}
            />
          </div>
        </div>

        {phase === 'intro' ? (
          <Card className="animate-fade-up">
            <CardContent className="py-8 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 text-white">
                <Bot className="size-6" />
              </div>
              <h1 className="mt-4 text-xl font-bold">
                Hi {session.candidate_name || 'there'} 👋
              </h1>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                This is your AI voice interview for the <strong>{session.job_title}</strong> role.
                I&apos;ll ask around {target} questions based on your resume, and may follow up on
                your answers. Answer out loud with your microphone, or type — whichever you prefer.
              </p>
              {!stt.supported && (
                <p className="mx-auto mt-3 max-w-sm rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
                  Voice input isn&apos;t supported in this browser — you can type your answers, or
                  switch to Chrome/Edge for the full voice experience.
                </p>
              )}
              <Button size="lg" className="mt-6" onClick={beginInterview}>
                Start interview <Send className="size-4" />
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="animate-fade-up">
            <CardContent className="space-y-5 py-6">
              {/* question */}
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 text-white">
                  <Bot className="size-4.5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                      {session.current_question?.topic || 'Question'}
                    </span>
                    {session.current_question?.is_follow_up && (
                      <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-medium text-violet-600 dark:text-violet-400">
                        follow-up
                      </span>
                    )}
                    <button
                      onClick={() => tts.speak(session.current_question?.question)}
                      className="inline-flex cursor-pointer items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                      title="Replay question"
                    >
                      <Volume2 className={cn('size-3.5', tts.speaking && 'text-blue-500')} /> replay
                    </button>
                  </div>
                  <p className="mt-1 text-lg leading-snug font-medium text-balance">
                    {session.current_question?.question}
                  </p>
                </div>
              </div>

              {/* answer area */}
              <div className="rounded-xl border bg-muted/30 p-3">
                <Textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder={
                    stt.supported
                      ? 'Tap the mic and speak, or type your answer here...'
                      : 'Type your answer here...'
                  }
                  rows={5}
                  className="resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                />
                {stt.listening && (
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-red-500">
                    <span className="size-2 animate-pulse-dot rounded-full bg-red-500" /> Listening...
                  </div>
                )}
                {stt.error && <p className="mt-1 text-xs text-amber-600">{stt.error}</p>}
              </div>

              {submitError && <p className="text-sm text-destructive">{submitError}</p>}

              {/* controls */}
              <div className="flex items-center justify-between gap-3">
                {stt.supported ? (
                  <Button
                    variant={stt.listening ? 'destructive' : 'outline'}
                    onClick={toggleMic}
                    disabled={phase === 'submitting' || phase === 'completing'}
                  >
                    {stt.listening ? (
                      <>
                        <Square className="size-4" /> Stop
                      </>
                    ) : (
                      <>
                        <Mic className="size-4" /> Record answer
                      </>
                    )}
                  </Button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Keyboard className="size-4" /> Typed answers
                  </span>
                )}

                <Button
                  onClick={submitAnswer}
                  disabled={phase === 'submitting' || phase === 'completing' || !answer.trim()}
                >
                  {phase === 'submitting' || phase === 'completing' ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      {phase === 'completing' ? 'Evaluating...' : 'Saving...'}
                    </>
                  ) : (
                    <>
                      Submit answer <Send className="size-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-[11px] text-muted-foreground">
          Powered by AgentHire · your answers are evaluated by AI and reviewed by a human recruiter.
        </p>
      </div>
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <div className="dot-grid pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-200 -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,oklch(0.546_0.245_262.881/0.12),transparent_65%)]" />
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="relative flex w-full flex-col items-center">{children}</div>
    </div>
  );
}
