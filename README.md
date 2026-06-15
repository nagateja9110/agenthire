# AgentHire — AI Recruitment Agent Platform

**Live app:** [agenthire-rho.vercel.app](https://agenthire-rho.vercel.app)
**API:** [agenthire-server.onrender.com](https://agenthire-server.onrender.com)

## The problem

Hiring for even a single role means a recruiter has to read through dozens (sometimes
hundreds) of resumes, check each one against the job's requirements, decide who's worth
a closer look, write interview questions, and email everyone back — once if shortlisted,
once if rejected. Most of that work is repetitive and the same every time, but it still
eats hours every week, and candidates often wait days just to hear "thanks, but no."

## The solution

AgentHire automates the repetitive part of screening while keeping a human in charge of
the actual decision. A recruiter creates a job and shares one public link. Candidates
apply by uploading a PDF resume — no account needed. From there, a pipeline of seven
cooperating AI agents reads the resume, scores it against the job's requirements,
shortlists or rejects it, and **pauses and waits for the recruiter to approve** before
anything irreversible — like an interview invite — goes out. Once approved, the platform
generates interview questions and a coding task and emails the candidate automatically.

Every threshold the agents use (minimum score, what counts as a "skill match", how many
retries on failure, etc.) lives in plain JSON files under [`/specs`](specs) — so the
hiring policy can be tuned without touching code, and every workflow run is traceable
back to the exact rules it was evaluated against.

## How it works

```
Resume upload (public, PDF)
   ↓
resume_parser      → extracts name, skills, experience from the PDF
   ↓
embedding_agent    → turns the resume into vectors (Qdrant) for similarity search
   ↓
matching_agent     → scores the candidate against the job's required skills
   ↓
shortlisting_agent → shortlisted / hold / rejected, based on /specs thresholds
   ↓                              ↘ rejected ─────────────┐
human_approval     → PAUSES here until the recruiter approves
   ↓ approved                     ↘ rejected ─────────────┤
interview_agent    → generates interview questions + a coding task
   ↓                                                      ↓
email_agent        → sends interview invite ───────── or rejection email
   ↓
completed
```

Recruiters watch this happen live on a React Flow canvas — each agent lights up as it
runs, with logs, retry counts, and timing for every step.

## Impact

- **Recruiter time per resume drops from minutes to seconds** — screening, scoring, and
  the first-pass decision all happen automatically.
- **Candidates hear back faster**, win or lose, instead of being left in silence.
- **Nothing happens without sign-off** — the human-approval checkpoint means the AI
  narrows the field, but a person still makes the call.
- **The hiring bar is consistent and auditable** — every decision traces back to the
  spec file that produced it, not someone's mood that day.

## Screenshots

> _Add screenshots to `docs/screenshots/` and reference them here._

| | |
|---|---|
| Landing page | `docs/screenshots/landing.png` |
| Recruiter dashboard (overview stats) | `docs/screenshots/dashboard.png` |
| Public job apply page (candidate view) | `docs/screenshots/apply.png` |
| Live workflow canvas (agents running) | `docs/screenshots/workflow-canvas.png` |
| Candidates list with status filters | `docs/screenshots/candidates.png` |
| Analytics page | `docs/screenshots/analytics.png` |

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 15, React 19, Tailwind, shadcn-style UI, Zustand, React Flow |
| Backend | Node 20+, Express, MongoDB/Mongoose, JWT auth |
| AI | LangGraph, LangChain, Groq (primary) → OpenRouter (fallback), local embeddings (`bge-small-en-v1.5`), Qdrant |
| Email | Resend (falls back to logged output without an API key) |
| Tests | Jest + Supertest (33 tests, incl. full workflow E2E), Playwright |

**No API keys required to run the demo** — every agent has a deterministic fallback if
Groq/OpenRouter/Resend keys aren't set.

## Running it locally

```bash
# 1. Databases (MongoDB :27017, Qdrant :6333)
docker compose up -d

# 2. Backend (http://localhost:5001 - macOS AirPlay owns 5000)
cd server && cp .env.example .env && npm install && npm run dev

# 3. Frontend (http://localhost:3000)
cd client && npm install && npm run dev

# 4. Sample resumes for the demo
node scripts/make-sample-resume.js
```

Then: sign up at `/signup` → create a job → **Copy public apply link** → open it in an
incognito window → submit `scripts/john-react-resume.pdf` → watch it run on
**Dashboard → Workflows** → Approve → see the interview pack and invite email in the logs.

### Optional API keys (`server/.env`)

| Variable | Effect when set |
|---|---|
| `GROQ_API_KEY` | LLM-powered resume parsing, recommendations, interview generation |
| `OPENROUTER_API_KEY` | Automatic fallback when Groq fails |
| `RESEND_API_KEY` | Real email delivery (otherwise rendered output is logged) |

## Project structure

```
client/   Next.js app (dashboard, public job + apply pages, workflow canvas)
server/   Express API (routes/controllers/services/agents/workflows/rag/...)
specs/    JSON business rules (single source of truth for hiring policy)
docs/     Hiring policy + interview guidelines (seeded into RAG)
scripts/  Demo resume generator
```

## Tests

```bash
cd server && npm test               # 33 Jest/Supertest tests
cd client && npx playwright test    # browser E2E (needs MongoDB running)
```
