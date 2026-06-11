# AgentHire — AI Recruitment Agent Platform

A spec-driven, multi-agent recruitment platform. Recruiters create jobs and share a public
apply link; candidates upload a PDF resume; a **LangGraph** workflow of seven cooperating AI
agents parses, embeds, scores, and shortlists the candidate — then **pauses for human
approval** before generating interview material and sending the email. Every hiring rule is
traceable to a JSON file under [`/specs`](specs).

## How it works

```
Resume upload (public, PDF)
   ↓
resume_parser      → structured candidate facts (LLM or deterministic fallback)
   ↓
embedding_agent    → bge-small-en-v1.5 embeddings → Qdrant (RAG)
   ↓
matching_agent     → deterministic scoring vs job skills + policy context (RAG)
   ↓
shortlisting_agent → shortlisted / hold / rejected (thresholds from /specs)
   ↓                              ↘ rejected ─────────────┐
human_approval     → PAUSES until recruiter approves      │
   ↓ approved                     ↘ rejected ─────────────┤
interview_agent    → questions, coding task, rubric       │
   ↓                                                      ↓
email_agent        → interview invite ──────────── or rejection email (Resend)
   ↓
completed
```

The same graph renders live on a **React Flow** canvas with spec-driven node colors,
retry counts, execution order, and per-agent logs.

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, Tailwind, shadcn-style UI, Zustand, React Hook Form + Zod, React Flow (`@xyflow/react`) |
| Backend | Node 20+, Express, Mongoose/MongoDB, Zod, JWT + bcryptjs, multer, helmet, rate limiting |
| AI | LangGraph (MongoDB checkpointer), LangChain, Groq (primary LLM) → OpenRouter (fallback), `@xenova/transformers` running `bge-small-en-v1.5` locally, Qdrant vector DB |
| Email | Resend (graceful fallback output without an API key) |
| Tests | Jest + Supertest (33 tests incl. full workflow E2E), Playwright |

**No API keys required to run the demo** — every agent has a deterministic fallback, and
email/embedding/vector layers degrade gracefully.

## Quickstart

```bash
# 1. Databases (MongoDB :27017, Qdrant :6333)
docker compose up -d

# 2. Backend (http://localhost:5000)
cd server && cp .env.example .env && npm install && npm run dev

# 3. Frontend (http://localhost:3000)
cd client && npm install && npm run dev

# 4. Sample resumes for the demo
node scripts/make-sample-resume.js
```

Then: sign up at `/signup` → create a job → **Copy public apply link** → open it in an
incognito window → submit `scripts/john-react-resume.pdf` → watch the workflow run on
**Dashboard → Workflows** → Approve → see the interview pack and invite email in the logs.

### Optional API keys (`server/.env`)

| Variable | Effect when set |
|---|---|
| `GROQ_API_KEY` | LLM-powered resume parsing, recommendations, interview generation |
| `OPENROUTER_API_KEY` | Automatic fallback when Groq fails |
| `RESEND_API_KEY` | Real email delivery (otherwise rendered output is logged) |

## Spec-driven rules

All business rules live in versionable JSON under [`/specs`](specs) and are **snapshotted
into each workflow document at start**, so in-flight runs are immune to later edits:

| File | Controls |
|---|---|
| `specs/hiring/frontend-developer.json` | role, base skills, `minimum_score` override, interview rounds |
| `specs/workflow/default-hiring-workflow.json` | agent execution order |
| `specs/workflow/node-states.json` | React Flow node colors per state |
| `specs/evaluation/shortlisting-rules.json` | shortlist/hold/reject thresholds |
| `specs/evaluation/rag-retrieval.json` | chunk sizes, top-k, similarity floor, model |
| `specs/prompts/*.json` | agent prompts, temperatures, weights, output schemas |
| `specs/email/*.json` | email templates |
| `specs/system/retry-policy.json` | max retries, delay, retryable error codes |

## API

| Method & path | Auth | Purpose |
|---|---|---|
| `POST /auth/signup` / `POST /auth/login` / `GET /auth/me` | — / — / JWT | recruiter auth |
| `POST /jobs` / `PUT /jobs/:id` | JWT | create / update job |
| `GET /jobs` / `GET /jobs/:id` | public | browse jobs (use `?mine=true` + JWT for own jobs) |
| `POST /candidates/upload` | public (rate-limited) | PDF apply → **auto-starts workflow** |
| `GET /candidates` / `GET /candidates/:id` | JWT | recruiter-scoped candidates |
| `POST /workflow/approve` | JWT | resolve the human-approval checkpoint |
| `POST /workflow/retry` / `POST /workflow/start` | JWT | recover / manual start |
| `GET /workflows` / `GET /workflow/:id` | JWT | executions / detail with logs + node states |
| `GET /analytics` | JWT | totals, shortlist rate, completion rate, agent metrics |

## Tests

```bash
cd server && npm test          # 33 Jest/Supertest tests (uses in-memory Mongo + vector store)
cd client && npx playwright test   # browser E2E (needs MongoDB running)
```

## Project structure

```
client/   Next.js app (dashboard, public job + apply pages, React Flow canvas)
server/   Express API (config/routes/controllers/services/validators/middleware/
          models/agents/workflows/rag/analytics/emails/utils/constants)
specs/    JSON business rules (single source of truth)
docs/     Hiring policy + interview guidelines (seeded into RAG)
scripts/  Demo resume generator
```
