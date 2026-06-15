'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Mail,
  Phone,
  Briefcase,
  Calendar,
  ExternalLink,
  Download,
  FileText,
  GraduationCap,
  FolderGit2,
  Workflow,
} from 'lucide-react';
import { api, API_URL } from '@/lib/api';
import { cn, formatDate, initials, scoreColor } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { StatusBadge, EngineBadge } from '@/components/status-badge';
import { InterviewReview } from '@/components/InterviewReview';
import { AiAssessment } from '@/components/AiAssessment';
import { PageLoader } from '@/components/ui/spinner';

function InfoRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-center gap-2.5 text-sm">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto truncate font-medium">{children}</span>
    </div>
  );
}

export default function CandidateDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [candidate, setCandidate] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await api(`/candidates/${id}`);
      setCandidate(data.candidate);
    } catch (err) {
      setError(err.message);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => router.back()}
          className="inline-flex cursor-pointer items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Back
        </button>
        <p className="py-10 text-sm text-destructive">{error}</p>
      </div>
    );
  }
  if (!candidate) return <PageLoader label="Loading candidate..." />;

  const parsed = candidate.parsed_resume_json || {};
  const resumeUrl = candidate.resume_url ? `${API_URL}${candidate.resume_url}` : null;
  const skills = Array.isArray(parsed.skills) ? parsed.skills : [];
  const projects = Array.isArray(parsed.projects) ? parsed.projects : [];

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/candidates"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Back to candidates
      </Link>

      {/* header */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="size-14">
              <AvatarFallback className="bg-gradient-to-br from-blue-500/15 to-violet-500/15 text-base font-semibold">
                {initials(candidate.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold tracking-tight">{candidate.name}</h1>
                <StatusBadge status={candidate.status} />
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Applied for {candidate.job_id?.title || 'a role'} · {formatDate(candidate.created_at)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div className="text-right">
              <p className="text-[11px] text-muted-foreground">Match score</p>
              <p className={cn('text-3xl font-bold tabular-nums', scoreColor(candidate.match_score))}>
                {candidate.match_score ?? '—'}
              </p>
            </div>
            {candidate.workflow_id && (
              <Link href="/dashboard/workflows">
                <Button variant="outline" size="sm">
                  <Workflow className="size-4" /> View workflow
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI decision + reasoning + approve/reject */}
      <AiAssessment candidate={candidate} onDecision={load} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* left: details */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow icon={Mail} label="Email">{candidate.email}</InfoRow>
              <InfoRow icon={Phone} label="Phone">{candidate.phone}</InfoRow>
              <InfoRow icon={Briefcase} label="Job">{candidate.job_id?.title || '—'}</InfoRow>
              <InfoRow icon={Calendar} label="Applied">{formatDate(candidate.created_at)}</InfoRow>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                Parsed resume
                {parsed.engine && <EngineBadge engine={parsed.engine} />}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Experience</p>
                <p className="mt-0.5 text-sm">
                  {parsed.experience != null ? `${parsed.experience} years` : 'Not detected'}
                </p>
              </div>

              <div>
                <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <GraduationCap className="size-3.5" /> Education
                </p>
                <p className="mt-0.5 text-sm">{parsed.education || 'Not detected'}</p>
              </div>

              <Separator />

              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Skills {skills.length > 0 && `(${skills.length})`}
                </p>
                {skills.length === 0 ? (
                  <p className="mt-1 text-sm text-muted-foreground">None detected</p>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {skills.map((s) => (
                      <Badge key={s} variant="secondary" className="font-normal">{s}</Badge>
                    ))}
                  </div>
                )}
              </div>

              {projects.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <FolderGit2 className="size-3.5" /> Projects
                    </p>
                    <ul className="mt-2 space-y-2">
                      {projects.map((p, i) => (
                        <li key={i} className="rounded-lg border bg-muted/40 p-2.5">
                          <p className="text-sm font-medium">{p.title || `Project ${i + 1}`}</p>
                          {p.description && (
                            <p className="mt-0.5 text-xs text-muted-foreground">{p.description}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* right: the actual PDF */}
        <Card className="flex flex-col py-0">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Resume</span>
            </div>
            {resumeUrl && (
              <div className="flex gap-2">
                <a href={resumeUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="size-3.5" /> Open
                  </Button>
                </a>
                <a href={resumeUrl} download>
                  <Button variant="outline" size="sm">
                    <Download className="size-3.5" /> Download
                  </Button>
                </a>
              </div>
            )}
          </div>
          <CardContent className="flex-1 p-0">
            {resumeUrl ? (
              <iframe
                src={`${resumeUrl}#view=FitH`}
                title={`${candidate.name} resume`}
                className="h-[720px] w-full rounded-b-xl"
              />
            ) : (
              <div className="flex h-[720px] flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                <FileText className="size-6" />
                No resume file on record.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <InterviewReview candidateId={id} />
    </div>
  );
}
