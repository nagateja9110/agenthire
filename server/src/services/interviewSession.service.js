const crypto = require('crypto');
const InterviewSession = require('../models/InterviewSession');
const Candidate = require('../models/Candidate');
const Job = require('../models/Job');
const env = require('../config/env');
const { specs } = require('../utils/specLoader');
const { invokeLLM, parseJSONResponse, renderTemplate } = require('../agents/llm');
const { ApiError } = require('../utils/errors');
const { INTERVIEW_STATUS, CANDIDATE_STATUS } = require('../constants');

const EXPIRY_DAYS = 7;

function interviewLink(token) {
  return `${env.CLIENT_URL}/interview/${token}`;
}

// Target question count scales with experience (from the conductor spec).
function targetForExperience(years) {
  const spec = specs.interviewConductorPrompt();
  const exp = typeof years === 'number' ? years : 0;
  for (const band of spec.target_by_experience) {
    if (exp <= band.max_years) return band.count;
  }
  return spec.default_target;
}

/**
 * Created only for APPROVED candidates (gated by the human checkpoint).
 * Stores the resume + job context the conductor uses to generate adaptive,
 * resume-grounded questions live during the interview.
 */
async function createSession({ candidate, job, hiringSpec, workflowId, questions, rubric }) {
  const parsed = candidate.parsed_resume_json || {};
  const token = crypto.randomBytes(24).toString('base64url');
  const expires = new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const session = await InterviewSession.create({
    token,
    candidate_id: candidate._id,
    job_id: job._id || job.id,
    workflow_id: workflowId,
    status: INTERVIEW_STATUS.PENDING,
    // interview_agent questions kept only as a no-LLM fallback pool.
    questions: (questions || [])
      .filter((q) => q && q.question)
      .map((q) => ({ topic: q.topic || 'General', question: q.question })),
    rubric: rubric || [],
    resume_context: {
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      experience: typeof parsed.experience === 'number' ? parsed.experience : null,
      education: parsed.education || null,
      projects: Array.isArray(parsed.projects) ? parsed.projects.slice(0, 5) : [],
    },
    job_context: {
      role: (hiringSpec && hiringSpec.role) || job.title || 'the role',
      required_skills: job.required_skills || [],
      preferred_skills: job.preferred_skills || [],
    },
    target_questions: targetForExperience(parsed.experience),
    expires_at: expires,
  });
  return { session, link: interviewLink(token) };
}

function transcriptText(session) {
  const lines = [];
  for (const t of session.transcript) {
    lines.push(`${t.role === 'interviewer' ? 'Interviewer' : 'Candidate'}: ${t.text}`);
  }
  return lines.join('\n') || '(no questions yet - ask your opening question)';
}

/**
 * Resume-grounded question pool for the no-LLM fallback: builds questions
 * from the candidate's actual projects and skills, then generic probes.
 */
function fallbackQuestionPool(session) {
  const pool = [];
  for (const p of session.resume_context.projects || []) {
    if (p.title) {
      pool.push({
        topic: p.title,
        question: `Tell me about your project "${p.title}". What was your specific role, and what was the hardest technical problem you solved?`,
        is_follow_up: false,
      });
    }
  }
  for (const skill of (session.resume_context.skills || []).slice(0, 6)) {
    pool.push({
      topic: skill,
      question: `Where have you used ${skill} in real work, and what trade-offs did you run into?`,
      is_follow_up: false,
    });
  }
  for (const q of session.questions || []) {
    pool.push({ topic: q.topic || 'General', question: q.question, is_follow_up: false });
  }
  pool.push({
    topic: 'Problem solving',
    question: 'Describe the most difficult bug you have debugged. How did you isolate the root cause?',
    is_follow_up: false,
  });
  return pool;
}

/**
 * Generates the next interview question. With an LLM it adapts to the last
 * answer (follow-up vs new topic) grounded in the resume; without one it
 * draws the next unused resume-grounded question from the fallback pool.
 */
async function generateNextQuestion(session) {
  const spec = specs.interviewConductorPrompt();
  const askedTopics = new Set(
    session.transcript.filter((t) => t.role === 'interviewer').map((t) => t.text)
  );

  if (session.asked_count >= session.target_questions) {
    return { done: true };
  }

  const projects = (session.resume_context.projects || [])
    .map((p) => `  - ${p.title || 'Project'}: ${p.description || ''}`)
    .join('\n') || '  (none listed)';

  const llm = await invokeLLM({
    system: spec.system_prompt
      .replace('{role}', session.job_context.role)
      .replace('{min_questions}', spec.min_questions),
    user: renderTemplate(spec.user_prompt_template, {
      role: session.job_context.role,
      required_skills: (session.job_context.required_skills || []).join(', '),
      preferred_skills: (session.job_context.preferred_skills || []).join(', '),
      experience: session.resume_context.experience ?? 'unknown',
      skills: (session.resume_context.skills || []).join(', ') || 'unknown',
      projects,
      asked: session.asked_count,
      target: session.target_questions,
      transcript: transcriptText(session),
    }),
    temperature: spec.temperature,
  }).catch(() => null);

  if (llm) {
    try {
      const parsed = parseJSONResponse(llm.content);
      if (parsed.done && session.asked_count >= spec.min_questions) {
        return { done: true, engine: llm.provider };
      }
      if (parsed.question && !askedTopics.has(parsed.question)) {
        return {
          done: false,
          engine: llm.provider,
          question: String(parsed.question),
          topic: parsed.topic || 'General',
          is_follow_up: !!parsed.is_follow_up,
        };
      }
    } catch (err) {
      /* fall through to deterministic pool */
    }
  }

  // Deterministic fallback: next unused resume-grounded question.
  const pool = fallbackQuestionPool(session);
  const next = pool.find((q) => !askedTopics.has(q.question));
  if (!next) return { done: true, engine: 'fallback' };
  return { ...next, done: false, engine: 'fallback' };
}

function isExpired(session) {
  return session.expires_at && session.expires_at.getTime() < Date.now();
}

async function loadByToken(token) {
  const session = await InterviewSession.findOne({ token })
    .populate('candidate_id', 'name')
    .populate('job_id', 'title');
  if (!session) throw new ApiError(404, 'Interview link is invalid');
  if (session.status !== INTERVIEW_STATUS.COMPLETED && isExpired(session)) {
    session.status = INTERVIEW_STATUS.EXPIRED;
    await session.save();
  }
  return session;
}

// Candidate-facing view - never leaks the rubric or evaluation.
function publicView(session) {
  const completed = session.status === INTERVIEW_STATUS.COMPLETED;
  const pending =
    session.pending_question && session.pending_question.question
      ? {
          question: session.pending_question.question,
          topic: session.pending_question.topic,
          is_follow_up: session.pending_question.is_follow_up,
        }
      : null;
  const view = {
    status: session.status,
    candidate_name: session.candidate_id?.name,
    job_title: session.job_id?.title,
    // Adaptive interview: total isn't fixed, so expose a soft target.
    asked_count: session.asked_count,
    target_questions: session.target_questions,
    current_index: session.asked_count,
    current_question: pending,
    completed,
  };
  if (completed) {
    view.feedback = session.candidate_feedback || null;
    view.answers = qaPairs(session).map((p, i) => ({ index: i + 1, question: p.q, answer: p.a }));
  }
  return view;
}

// Generates and stores the next pending question if one isn't waiting.
async function ensurePendingQuestion(session) {
  if (session.pending_question && session.pending_question.question) return false;
  const next = await generateNextQuestion(session);
  if (next.engine) session.conductor_engine = next.engine;
  if (next.done) {
    session.pending_question = { question: null, topic: null, is_follow_up: false };
    await session.save();
    return true; // signals the interview should finish
  }
  session.pending_question = {
    question: next.question,
    topic: next.topic,
    is_follow_up: next.is_follow_up,
  };
  await session.save();
  return false;
}

async function getPublic(token) {
  const session = await loadByToken(token);
  if (session.status === INTERVIEW_STATUS.COMPLETED || session.status === INTERVIEW_STATUS.EXPIRED) {
    return publicView(session);
  }
  if (session.status === INTERVIEW_STATUS.PENDING) {
    session.status = INTERVIEW_STATUS.IN_PROGRESS;
    session.started_at = new Date();
    await session.save();
  }
  // Make sure there's a question waiting (generates the opening question).
  await ensurePendingQuestion(session);
  return publicView(session);
}

async function submitAnswer(token, { answer, mode }) {
  const session = await loadByToken(token);
  if (session.status === INTERVIEW_STATUS.COMPLETED) {
    throw new ApiError(409, 'This interview is already complete');
  }
  if (session.status === INTERVIEW_STATUS.EXPIRED) {
    throw new ApiError(410, 'This interview link has expired');
  }
  // Ensure there's a question to answer (handles a stale/empty state).
  if (!session.pending_question || !session.pending_question.question) {
    const finished = await ensurePendingQuestion(session);
    if (finished) return { done: true, asked_count: session.asked_count };
  }

  const q = session.pending_question;
  session.transcript.push({ role: 'interviewer', text: q.question, question_index: session.asked_count });
  session.transcript.push({
    role: 'candidate',
    text: String(answer || '').trim(),
    question_index: session.asked_count,
    input_mode: mode === 'voice' ? 'voice' : 'text',
  });
  session.asked_count += 1;
  session.pending_question = { question: null, topic: null, is_follow_up: false };
  if (session.status === INTERVIEW_STATUS.PENDING) session.status = INTERVIEW_STATUS.IN_PROGRESS;
  await session.save();

  // Generate the next adaptive question (or finish).
  const finished = await ensurePendingQuestion(session);
  if (finished) {
    return { done: true, asked_count: session.asked_count };
  }
  return {
    done: false,
    asked_count: session.asked_count,
    target_questions: session.target_questions,
    current_question: {
      question: session.pending_question.question,
      topic: session.pending_question.topic,
      is_follow_up: session.pending_question.is_follow_up,
    },
  };
}

function qaPairs(session) {
  const pairs = [];
  for (const turn of session.transcript) {
    if (turn.role === 'interviewer') pairs.push({ q: turn.text, a: '' });
    else if (pairs.length) pairs[pairs.length - 1].a = turn.text;
  }
  return pairs;
}

/**
 * Deterministic fallback evaluation when no LLM is configured: grades on
 * answer substance (length / non-empty) so the flow still completes.
 */
function fallbackEvaluation(session) {
  const pairs = qaPairs(session);
  const answered = pairs.filter((p) => p.a && p.a.length > 0);
  const avgLen = answered.length
    ? answered.reduce((s, p) => s + p.a.length, 0) / answered.length
    : 0;
  const coverage = pairs.length ? answered.length / pairs.length : 0;
  const score = Math.round(Math.min(100, coverage * 60 + Math.min(avgLen / 12, 1) * 40));
  const level = score >= 70 ? 'yes' : score >= 45 ? 'no' : 'strong_no';
  return {
    criteria: (session.rubric || []).map((r) => ({
      criterion: r.criterion,
      level: answered.length ? level : 'not_assessed',
      note: 'Heuristic grade (no LLM configured): based on answer completeness and length.',
    })),
    summary: `Candidate answered ${answered.length}/${pairs.length} questions. Automatic heuristic evaluation - configure an LLM key for a substantive review.`,
    recommendation: score >= 70 ? 'advance' : score >= 45 ? 'borderline' : 'do_not_advance',
    overall_score: score,
    engine: 'fallback',
  };
}

// Candidate-safe feedback used when the LLM doesn't supply its own.
function fallbackCandidateFeedback(session) {
  const pairs = qaPairs(session);
  const answered = pairs.filter((p) => p.a && p.a.length > 0).length;
  return {
    summary: `Thanks for completing the interview - you answered ${answered} of ${pairs.length} questions. Your responses have been shared with the recruiting team.`,
    strengths: answered === pairs.length ? ['Completed every question'] : [],
    improvements: answered < pairs.length ? ['Try to give a complete answer to every question'] : [],
  };
}

async function completeAndEvaluate(token) {
  const session = await loadByToken(token);
  if (session.status === INTERVIEW_STATUS.COMPLETED) {
    return reviewShape(session);
  }

  const job = await Job.findById(session.job_id);
  const spec = specs.interviewEvaluatorPrompt();
  const pairs = qaPairs(session);

  let evaluation = null;
  let candidateFeedback = null;
  const llm = await invokeLLM({
    system: spec.system_prompt,
    user: renderTemplate(spec.user_prompt_template, {
      role: job ? job.title : 'the role',
      required_skills: job ? (job.required_skills || []).join(', ') : '',
      rubric: (session.rubric || []).map((r) => `- ${r.criterion}: ${r.description || ''}`).join('\n'),
      transcript: pairs.map((p, i) => `Q${i + 1}: ${p.q}\nA${i + 1}: ${p.a || '(no answer)'}`).join('\n\n'),
    }),
    temperature: spec.temperature,
  }).catch(() => null);

  if (llm) {
    try {
      const parsed = parseJSONResponse(llm.content);
      evaluation = {
        criteria: Array.isArray(parsed.criteria) ? parsed.criteria : [],
        summary: parsed.summary || '',
        recommendation: spec.recommendations.includes(parsed.recommendation)
          ? parsed.recommendation
          : 'borderline',
        overall_score:
          typeof parsed.overall_score === 'number' ? Math.round(parsed.overall_score) : null,
        engine: llm.provider,
      };
      const cf = parsed.candidate_feedback;
      if (cf && typeof cf === 'object') {
        candidateFeedback = {
          summary: cf.summary || '',
          strengths: Array.isArray(cf.strengths) ? cf.strengths.slice(0, 5) : [],
          improvements: Array.isArray(cf.improvements) ? cf.improvements.slice(0, 5) : [],
        };
      }
    } catch (err) {
      evaluation = null;
    }
  }
  if (!evaluation) evaluation = fallbackEvaluation(session);
  if (!candidateFeedback) candidateFeedback = fallbackCandidateFeedback(session);

  session.evaluation = evaluation;
  session.candidate_feedback = candidateFeedback;
  session.status = INTERVIEW_STATUS.COMPLETED;
  session.completed_at = new Date();
  await session.save();

  await Candidate.updateOne({ _id: session.candidate_id }, { status: CANDIDATE_STATUS.INTERVIEWED });

  return reviewShape(session);
}

function reviewShape(session) {
  return {
    status: session.status,
    questions: session.questions,
    transcript: session.transcript,
    evaluation: session.evaluation,
    started_at: session.started_at,
    completed_at: session.completed_at,
    expires_at: session.expires_at,
  };
}

// Recruiter review - scoped to the recruiter's own candidates.
async function getReviewForCandidate(candidateId, userId) {
  const candidate = await Candidate.findById(candidateId).populate('job_id', 'created_by');
  if (!candidate) throw new ApiError(404, 'Candidate not found');
  if (candidate.job_id.created_by.toString() !== userId.toString()) {
    throw new ApiError(403, 'Not your candidate');
  }
  const session = await InterviewSession.findOne({ candidate_id: candidateId }).sort({ created_at: -1 });
  if (!session) return { exists: false };
  return { exists: true, ...reviewShape(session), link: interviewLink(session.token) };
}

module.exports = {
  createSession,
  getPublic,
  submitAnswer,
  completeAndEvaluate,
  getReviewForCandidate,
  interviewLink,
};
