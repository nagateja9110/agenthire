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
  Play,
  Code2,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ThemeToggle } from '@/components/theme-toggle';
import { CodeEditorPanel } from '@/components/CodeEditorPanel';
import { useInterviewerVoice, useSpeechRecognition, useVoiceRecorder } from '@/hooks/useSpeech';

export default function InterviewPage() {
  const { token } = useParams();
  const [session, setSession] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [phase, setPhase] = useState('loading'); // loading | intro | asking | submitting | coding | completing | done
  const [answer, setAnswer] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [transcribing, setTranscribing] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState('python');
  const [codeByLang, setCodeByLang] = useState({ python: '', cpp: '', java: '' });
  const [codeInit, setCodeInit] = useState(false);
  const [running, setRunning] = useState(false);
  const [runResults, setRunResults] = useState(null);
  const code = codeByLang[codeLanguage] || '';
  const setCode = (value) => setCodeByLang((prev) => ({ ...prev, [codeLanguage]: value }));

  const tts = useInterviewerVoice(token, session?.voice?.tts);
  const stt = useSpeechRecognition();
  const recorder = useVoiceRecorder();
  const useRecorder = !!session?.voice?.stt && recorder.supported;
  const askedRef = useRef(-1);

  const loadSession = useCallback(async () => {
    try {
      const data = await api(`/interview/${token}`);
      setSession(data);
      if (data.completed || data.status === 'completed') setPhase('done');
      else if (data.status === 'expired') setLoadError('This interview link has expired.');
      else if (data.phase === 'coding') setPhase('coding');
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

  // Seed the editor with each language's boilerplate once the coding task loads.
  useEffect(() => {
    const starter = session?.coding_task?.starter_code;
    if (starter && !codeInit) {
      setCodeByLang({
        python: starter.python || '',
        cpp: starter.cpp || '',
        java: starter.java || '',
      });
      setCodeInit(true);
    }
  }, [session, codeInit]);

  const [lastInputWasVoice, setLastInputWasVoice] = useState(false);
  const micSupported = useRecorder || stt.supported;
  const listening = useRecorder ? recorder.recording : stt.listening;

  function beginInterview() {
    setPhase('asking');
  }

  async function toggleMic() {
    setSubmitError('');
    if (useRecorder) {
      if (recorder.recording) {
        tts.stop();
        const blob = await recorder.stop();
        if (blob && blob.size > 0) {
          setTranscribing(true);
          try {
            const fd = new FormData();
            fd.append('audio', blob, 'answer.webm');
            const result = await api(`/interview/${token}/transcribe`, { method: 'POST', formData: fd });
            if (result.text) {
              setAnswer(result.text);
              setLastInputWasVoice(true);
            }
          } catch {
            /* keep whatever was typed */
          }
          setTranscribing(false);
        }
      } else {
        tts.stop();
        setAnswer('');
        setLastInputWasVoice(false);
        await recorder.start();
      }
      return;
    }
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
        body: {
          answer: answer.trim(),
          mode: useRecorder
            ? lastInputWasVoice
              ? 'voice'
              : 'text'
            : stt.listening || answer === stt.transcript
            ? 'voice'
            : 'text',
        },
      });
      stt.reset();
      setAnswer('');
      setLastInputWasVoice(false);
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
      } else if (res.phase === 'coding') {
        setSession((s) => ({ ...s, asked_count: res.asked_count, coding_task: res.coding_task }));
        setPhase('coding');
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

  async function runCodeTask() {
    setRunning(true);
    setSubmitError('');
    setRunResults(null);
    try {
      const res = await api(`/interview/${token}/run`, {
        method: 'POST',
        body: { code, language: codeLanguage },
      });
      setRunResults(res);
    } catch (err) {
      setSubmitError(err.message);
    }
    setRunning(false);
  }

  async function submitCodeTask() {
    setPhase('completing');
    setSubmitError('');
    try {
      await api(`/interview/${token}/code`, { method: 'POST', body: { code, language: codeLanguage } });
      await api(`/interview/${token}/complete`, { method: 'POST' });
      try {
        const finished = await api(`/interview/${token}`);
        setSession(finished);
      } catch {
        /* keep whatever we have */
      }
      setPhase('done');
    } catch (err) {
      setSubmitError(err.message);
      setPhase('coding');
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

  // ---- coding round (wide layout: problem on the left, editor on the right) ----
  if (phase === 'coding' || (phase === 'completing' && session.coding_task)) {
    const task = session.coding_task || {};
    const completing = phase === 'completing';
    return (
      <Shell>
        <div className="w-full max-w-6xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code2 className="size-5 text-violet-500" />
              <h1 className="text-lg font-semibold">Coding challenge</h1>
              {task.difficulty && (
                <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium text-violet-600 dark:text-violet-400">
                  {task.difficulty}
                </span>
              )}
            </div>
            <span className="text-xs text-muted-foreground">{session.job_title}</span>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* problem statement + sample tests */}
            <Card className="overflow-hidden">
              <CardContent className="max-h-[72vh] space-y-4 overflow-auto py-5">
                <h2 className="text-base font-semibold">{task.title}</h2>
                <pre className="font-sans text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                  {task.description}
                </pre>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Sample test cases</p>
                  {(task.sample_tests || []).map((s, i) => (
                    <div key={i} className="rounded-lg border p-3 text-xs">
                      <p className="font-medium">Example {i + 1}</p>
                      <p className="mt-1.5 text-muted-foreground">Input</p>
                      <pre className="mt-0.5 rounded bg-muted/50 p-2 whitespace-pre-wrap">{s.input}</pre>
                      <p className="mt-1.5 text-muted-foreground">Expected output</p>
                      <pre className="mt-0.5 rounded bg-muted/50 p-2 whitespace-pre-wrap">{s.expected_output}</pre>
                      {s.explanation && <p className="mt-1.5 text-muted-foreground">{s.explanation}</p>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* editor + run/submit controls */}
            <div className="flex flex-col gap-3">
              <div className="h-[60vh]">
                <CodeEditorPanel
                  language={codeLanguage}
                  onLanguageChange={setCodeLanguage}
                  code={code}
                  onCodeChange={setCode}
                  height="100%"
                />
              </div>

              {runResults && (
                <Card>
                  <CardContent className="max-h-48 space-y-2 overflow-auto py-3">
                    <p className="text-xs font-medium">
                      Sample results: {runResults.passed}/{runResults.total} passed
                    </p>
                    {runResults.results.map((r, i) => (
                      <div key={i} className="rounded-md border p-2 text-xs">
                        <div className="flex items-center gap-1.5">
                          {r.passed ? (
                            <CheckCircle className="size-3.5 text-emerald-500" />
                          ) : (
                            <XCircle className="size-3.5 text-red-500" />
                          )}
                          <span className="font-medium">Test {i + 1}</span>
                        </div>
                        {!r.passed && (
                          <div className="mt-1 space-y-0.5 text-muted-foreground">
                            {r.error ? (
                              <pre className="whitespace-pre-wrap text-red-500">{r.error}</pre>
                            ) : (
                              <>
                                <p>Expected: <code className="text-foreground">{r.expected}</code></p>
                                <p>Got: <code className="text-foreground">{r.actual || '(no output)'}</code></p>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {submitError && <p className="text-sm text-destructive">{submitError}</p>}

              <div className="flex items-center justify-between gap-3">
                <Button variant="outline" onClick={runCodeTask} disabled={running || completing}>
                  {running ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Running...
                    </>
                  ) : (
                    <>
                      <Play className="size-4" /> Run samples
                    </>
                  )}
                </Button>
                <Button onClick={submitCodeTask} disabled={running || completing}>
                  {completing ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Evaluating...
                    </>
                  ) : (
                    <>
                      Submit solution <Send className="size-4" />
                    </>
                  )}
                </Button>
              </div>
              <p className="text-center text-[11px] text-muted-foreground">
                Your solution is run against hidden test cases on submit · Python, C++, and Java supported.
              </p>
            </div>
          </div>
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
              {phase === 'coding' || (phase === 'completing' && session.coding_task) ? (
                'Coding challenge'
              ) : (
                <>
                  Question {idx + 1} <span className="text-muted-foreground/60">· ~{target} total</span>
                </>
              )}
            </span>
            <span>{session.job_title}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-500"
              style={{
                width: `${
                  phase === 'intro' ? 0 : phase === 'coding' || (phase === 'completing' && session.coding_task) ? 96 : progress
                }%`,
              }}
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
              {!micSupported && (
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
                    micSupported
                      ? 'Tap the mic and speak, or type your answer here...'
                      : 'Type your answer here...'
                  }
                  rows={5}
                  className="resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                />
                {listening && (
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-red-500">
                    <span className="size-2 animate-pulse-dot rounded-full bg-red-500" /> Listening...
                  </div>
                )}
                {transcribing && (
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="size-3 animate-spin" /> Transcribing...
                  </div>
                )}
                {stt.error && <p className="mt-1 text-xs text-amber-600">{stt.error}</p>}
                {recorder.error && <p className="mt-1 text-xs text-amber-600">{recorder.error}</p>}
              </div>

              {submitError && <p className="text-sm text-destructive">{submitError}</p>}

              {/* controls */}
              <div className="flex items-center justify-between gap-3">
                {micSupported ? (
                  <Button
                    variant={listening ? 'destructive' : 'outline'}
                    onClick={toggleMic}
                    disabled={phase === 'submitting' || phase === 'completing' || transcribing}
                  >
                    {listening ? (
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
                  disabled={phase === 'submitting' || phase === 'completing' || !answer.trim() || transcribing}
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
