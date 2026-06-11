What You Are Going to Build Today
Today you are going to build a full-stack AI-powered application called AgentHire - an AI Recruitment Agent platform. It is a recruiter-focused workspace where a recruiter can sign up, create jobs, monitor candidates, inspect AI workflows, approve candidates at a checkpoint, and review analytics. The candidate side is public: a candidate opens a job page, submits their name, email, phone number, and PDF resume, and the system automatically starts the AI workflow.

The platform converts an uploaded resume into a fully scored, decision-ready candidate by running it through a chain of cooperating agents - a Resume Parser Agent that extracts structured candidate facts, an Embedding Agent that pushes resume and policy chunks into Qdrant, a Matching Agent that compares the candidate against the job's required skills, preferred skills, and minimum experience using RAG context, a Shortlisting Agent that turns the score into a shortlisted / hold / rejected decision using thresholds from /specs, a Human Approval checkpoint that pauses the workflow, an Interview Agent that generates questions and rubrics, and an Email Agent that produces interview-invite or rejection output. The workflow is orchestrated by LangGraph with retries, checkpoints, resumability, and state persistence, and the same workflow is rendered live on a React Flow canvas with color-coded node states.

The stack is Next.js 15 App Router, React 19, Tailwind, shadcn/ui, Zustand, React Hook Form, Zod, and React Flow on the frontend, and Node.js, Express, MongoDB, Mongoose, Zod, JWT, bcryptjs, multer, helmet, and a modular Express architecture on the backend. AI behavior runs through LangGraph and LangChain, embeddings use BAAI/bge-small-en-v1.5, vectors live in Qdrant, the primary LLM is Groq's free tier with OpenRouter free models as a fallback, and email goes through Resend's free tier. The end result should feel like a modern recruiter console: clean, operational, workflow-driven, with every hiring rule traceable to a specification file under /specs.

Complete Specification - Overview and Tech Stack
Project Overview
Build a full-stack AI Recruitment Agent platform called AgentHire that lets recruiters create jobs, publish public application routes, receive candidate PDF resumes, and process those resumes through a LangGraph-driven AI workflow. The platform must pause the workflow at a human approval checkpoint, generate interview material, produce email output through Resend, persist every workflow step with retries and resumability, render the workflow live on a React Flow canvas, and report candidate and workflow analytics for recruiters.

The product must be spec-driven. All hiring thresholds, workflow order, retry policy, prompt rules, shortlisting rules, RAG chunking and similarity settings, email templates, and workflow node colors must come from /specs. These values must not be hardcoded inside controllers, services, agents, or UI components.

Tech Stack
Frontend uses Next.js 15 App Router, JavaScript, React 19, Tailwind CSS, shadcn/ui, Zustand, React Hook Form, Zod, React Flow, and lucide-react icons. Backend uses Node.js 20+, Express.js, MongoDB, Mongoose, Zod validation, JSON Web Tokens, bcryptjs, multer for PDF uploads, helmet, rate limiting, input sanitization, and a modular Express architecture (routes, controllers, services, validators, middleware, models, agents, workflows, rag, analytics, emails, utils, constants). AI orchestration is implemented through LangGraph workflows and LangChain agents, with embeddings produced by BAAI/bge-small-en-v1.5 and stored in Qdrant. The primary LLM provider is Groq's free tier, with OpenRouter free models as a fallback. Email is delivered through Resend's free tier. Tests run on Jest, Supertest, and Playwright. Sensitive credentials are loaded exclusively through environment variables.

Complete Specification - Authentication and Workflow Orchestration
Core Features
Authentication
The authentication system must support recruiter signup, recruiter login, JWT-based session handling, protected recruiter routes, an /auth/me profile endpoint, password hashing with bcryptjs, and persistent login state on the client through Zustand. Protected backend requests must verify the JWT, load the current user from MongoDB, and enforce role-based access. Public candidate routes must remain accessible without authentication, while every recruiter dashboard route must require auth.

Job Management
For job management, recruiters must be able to create jobs, list jobs, open job details, update jobs, and copy a public application link. Each job stores a title, description, required skills, preferred skills, minimum experience, workflow spec id, hiring spec id, creator (created_by), and creation timestamp. The matching logic must score candidates against the actual job document's saved required_skills, preferred_skills, and min_experience, while still using the base hiring spec from /specs/hiring/. Recruiter-facing list endpoints (jobs, candidates, workflows, analytics) must scope results to the authenticated recruiter through created_by - a recruiter never sees another recruiter's jobs, candidates, or workflows. Public job reads (GET /jobs and GET /jobs/:id) remain unscoped so candidates can browse and apply.

Candidate Applications
Candidate application routes must be public. A candidate must be able to open /jobs/[jobId], move to /jobs/[jobId]/apply, enter name, email, phone number, upload a PDF resume, and submit the application without recruiter authentication. The upload flow must validate file type, store the resume under /server/uploads, parse PDF text, create the candidate record, and start the AI workflow automatically. A candidate's resume upload must always trigger the workflow without any manual recruiter action.

Uploads must accept only application/pdf, enforce a 5 MB maximum file size, and extract text with pdfjs-dist (legacy build; the unmaintained pdf-parse package is incompatible with current Node). A duplicate application (same email for the same job) must be rejected with HTTP 409 and a reference to the existing application instead of starting a second workflow. POST /candidates/upload must carry its own strict rate limit (5 submissions per hour per IP) on top of the global rate limiter, because each submission triggers LLM, embedding, and email work.

Workflow Orchestration
For workflow orchestration, the backend must run each application through the LangGraph workflow defined by /specs/workflow/default-hiring-workflow.json:

resume_parser
embedding_agent
matching_agent
shortlisting_agent
human_approval
interview_agent
email_agent

LangGraph must support retries, checkpoints, resumability, state persistence, branching, and human approval pauses. The workflow engine must persist status, current state, retries, state output, logs, and timestamps. It must pause at human_approval until the recruiter approves or rejects, then resume from the saved state rather than restarting the entire chain.

Branching rules: the graph is conditional, not strictly linear. If the Shortlisting Agent returns rejected, the workflow skips human_approval and interview_agent and routes directly to email_agent with the rejection template. If it returns shortlisted or hold, the workflow pauses at human_approval; hold has no other exit path - the recruiter resolves it at the same checkpoint. On recruiter approval the workflow continues to interview_agent and then email_agent with the interview-invite template. On recruiter rejection it routes directly to email_agent with the rejection template. Every run terminates through email_agent into the completed status (or failed after retries are exhausted).

Spec snapshot: at workflow start, the engine must resolve all governing spec values (shortlisting thresholds, matching weights, retry policy, workflow order, RAG settings) and snapshot them into the workflow document. In-flight runs must be unaffected by later edits to /specs or to the job, and every recorded decision must be traceable to the rules as they were at execution time.

Checkpoint persistence: LangGraph checkpoints must be persisted in MongoDB through a MongoDB-backed checkpointer (for example @langchain/langgraph-checkpoint-mongodb or an equivalent custom saver) so that approval pauses and resumes survive server restarts. The in-memory MemorySaver is acceptable only in tests.

Complete Specification - AI Agents, RAG, LangGraph, and Email Layer
AI Agents
The agent layer must implement seven cooperating agents, each backed by a prompt or rules file under /specs/prompts/ or /specs/evaluation/.

The Resume Parser Agent parses uploaded PDF resumes and extracts candidate name, skills, experience, education, and projects. Its prompt behavior, temperature, known skills, and output schema must come from /specs/prompts/resume-parser.json, and the parser must respect both the known skills in the spec and the job-specific required and preferred skills.

The Embedding Agent generates embeddings using BAAI/bge-small-en-v1.5 run locally through @xenova/transformers (transformers.js) - no external embedding API - and stores them in Qdrant for resumes, hiring policies, evaluation docs, and interview guidelines.

The Matching Agent compares parsed resume data with the merged hiring spec and the RAG context. Scoring weights come from /specs/prompts/matching-agent.json. The agent must return matched required skills, matched preferred skills, missing skills, all_skills_matched, and the final match_score.

The Shortlisting Agent turns the match score into a decision using /specs/evaluation/shortlisting-rules.json. The current rules are >= 80 → shortlisted, 60-79 → hold, < 60 → rejected. Thresholds must come dynamically from /specs. The agent must never hardcode 80, 60, or any other threshold. Threshold precedence: when a job's hiring spec defines minimum_score, that value overrides the shortlist threshold from shortlisting-rules.json for that job (the job-specific spec wins over the global rules); the hold and reject bands continue to come from shortlisting-rules.json. The resolved thresholds are part of the workflow's spec snapshot.

The Human Approval checkpoint pauses workflow execution and waits for recruiter approval through POST /workflow/approve.

The Interview Agent generates interview questions, coding tasks, and rubrics according to /specs/prompts/interview-agent.json.

The Email Agent generates interview-invite or rejection output using /specs/email/interview-invite.json and /specs/email/rejection.json. Delivery goes through Resend when RESEND_API_KEY is set; otherwise the agent must produce fallback output instead of failing the workflow.

RAG Pipeline
The RAG layer must support organizational intelligence for resumes, hiring policies, evaluation docs, and interview guidelines. Resume chunks must be 500 characters, policy chunks must be 1000 characters, top_k retrieval must default to 5, and minimum_similarity must default to 0.75. Retrieval behavior must come from /specs/evaluation/rag-retrieval.json. The pipeline is Documents → Chunking → Embeddings → Qdrant Storage → Similarity Search → Context Injection → LLM Response.

Failure Handling
LLM timeouts, email API failures, and vector DB timeouts are retryable. Invalid PDFs, malformed JSON, and invalid request schemas are non-retryable. Every failure must log the agent name, workflow state, stack trace, and timestamp. Retry behavior is driven by /specs/system/retry-policy.json.

Complete Specification - Frontend Pages
The application uses the Next.js 15 App Router. The root page should guide users into authentication or the recruiter dashboard depending on session state.

/login and /signup provide the recruiter authentication forms. The frontend API client must read the auth token from localStorage or cookie so dashboard requests do not drift from the current session.

/dashboard displays the recruiter dashboard overview: job count, candidate count, workflow count, completion percentage, recent workflows, and quick actions such as refresh and create job.

/dashboard/jobs lists recruiter jobs and exposes a "Copy public apply link" action for each job.

/dashboard/jobs/create provides the Create Job form. The form includes title, description, required skills, preferred skills, minimum experience, skill preview chips, and a workflow-oriented layout.

/dashboard/candidates lists submitted candidates with status, match score, and job context.

/dashboard/workflows shows workflow executions, current state, approval status, logs, retry state, and the React Flow workflow visualization. Node colors must come from a node-states spec under /specs/workflow/. Live updates use polling: while any visible workflow is in pending, running, or waiting_approval status, the page polls the backend every 3 seconds and stops polling once all visible workflows are terminal (completed or failed).

/dashboard/analytics shows candidate statistics, shortlist rate, workflow completion rate, and agent execution metrics.

/jobs/[jobId] is the public job detail page.

/jobs/[jobId]/apply is the public candidate application page. It accepts candidate information and a PDF resume upload, shows the selected file name, displays processing state while the upload and workflow run, and shows a success message with workflow status and current state.

Complete Specification - Backend Architecture and Database Collections
Backend Architecture
The backend uses a modular Express architecture under /server/src/. The config layer centralizes environment loading, Mongo connection, and Qdrant configuration. The routes layer defines HTTP endpoints and middleware composition. The controllers layer parses request intent and shapes responses - it never talks to Mongo directly. The services layer owns business behavior for auth, jobs, candidates, workflows, analytics, RAG, and scoring. The validators layer uses Zod schemas to validate every request body. The middleware layer handles auth, role checks, validation, uploads, and errors. The models layer defines Mongoose schemas. The agents layer holds the seven cooperating agents (resume parser, embedding, matching, shortlisting, interview, email, and the human approval checkpoint hook). The workflows layer owns LangGraph workflow definitions and stateful execution. The rag layer wraps Qdrant access and the in-memory equivalent for tests. The analytics layer aggregates candidate and workflow metrics. The emails layer wraps Resend. The utils and constants layers own spec loading, scoring, response helpers, async error handling, and workflow failure logging.

Resume uploads must be stored under /server/uploads. Workflow logs must be stored under /server/logs. Mongoose models must exist under /server/src/models. Shared business rules must remain under root /specs.

Database Collections
users
id, name, email, password, role, created_at.
jobs
id, title, description, required_skills, preferred_skills, min_experience, workflow_spec_id, hiring_spec_id, created_by, created_at.
candidates
id, job_id, workflow_id, name, email, phone, resume_url, parsed_resume_json, match_score, status (applied | processing | shortlisted | hold | rejected | invited), created_at.
workflows
id, candidate_id, job_id, current_state, status (pending | running | waiting_approval | completed | failed), spec_snapshot, retries, created_at.
workflow_logs
id, workflow_id, agent_name, input, output, status (running | success | failed | waiting_approval), error, created_at.

Complete Specification - API Endpoints
Health and Auth

POST /auth/signup
create a recruiter account.
POST /auth/login
issue a JWT.
GET /auth/me
return the authenticated profile.
Jobs

POST /jobs
create a job. Requires recruiter auth.
GET /jobs
list jobs. Public, so public job pages can load. Supports page and limit query params.
GET /jobs/:id
get one job. Public, so candidates can view a job.
PUT /jobs/:id
update a job. Requires recruiter auth.
Candidates

POST /candidates/upload
public PDF resume upload that auto-starts the workflow.
GET /candidates
list candidates, scoped to the recruiter's jobs. Requires recruiter auth. Supports page, limit, job_id, and status query params.
GET /candidates/:id
get one candidate. Requires recruiter auth.
Workflows

POST /workflow/start
manually start a workflow. Requires recruiter auth.
POST /workflow/retry
retry a failed workflow. Requires recruiter auth.
POST /workflow/approve
approve or reject the human approval checkpoint. Requires recruiter auth.
GET /workflows
list workflow executions with status, current state, retry count, and candidate/job context, scoped to the recruiter's jobs. Requires recruiter auth. Supports page, limit, and status query params.
GET /workflow/:id
get one workflow with logs, node states, and execution order. Requires recruiter auth.
Analytics

GET /analytics
candidate statistics, shortlist rate, workflow completion rate, and agent execution metrics. Requires recruiter auth.
Complete Specification - Folder Structure and Development Phases
Folder Structure
The project root already contains client/ and server/. The AI agent must use the existing structure only and must never create frontend/, backend/, a NestJS scaffold, a Prisma schema, or any TypeScript files. AgentHire is JavaScript only.

ai-recruitment-platform/
|
|-- client/
|   |-- app/
|   |   |-- dashboard/
|   |   |-- jobs/
|   |   |-- auth/
|   |   |-- apply/
|   |
|   |-- components/
|   |-- features/
|   |-- hooks/
|   |-- store/
|   |-- lib/
|   |-- public/
|   |-- styles/
|
|-- server/
|   |-- src/
|   |   |-- config/
|   |   |-- routes/
|   |   |-- controllers/
|   |   |-- services/
|   |   |-- middleware/
|   |   |-- models/
|   |   |-- agents/
|   |   |-- workflows/
|   |   |-- rag/
|   |   |-- analytics/
|   |   |-- emails/
|   |   |-- validators/
|   |   |-- utils/
|   |   |-- constants/
|   |-- uploads/
|   |-- logs/
|   |-- tests/
|
|-- specs/
|   |-- hiring/
|   |-- workflow/
|   |-- evaluation/
|   |-- prompts/
|   |-- email/
|   |-- system/
|
|-- docker/
|-- docs/
|-- scripts/
|-- docker-compose.yml
|-- README.md
|-- .env

Development Phases
Phase 1
initialize the Next.js 15 frontend and the Express backend, configure Tailwind and shadcn/ui, connect to MongoDB through Mongoose, load environment variables, and implement signup, login, JWT-protected routes, role checks, and the recruiter dashboard shell.
Phase 2
implement recruiter jobs, public job detail pages, public candidate apply pages, PDF upload through multer, Mongoose models, and Zod validators.
Phase 3
implement the spec loader, the root /specs JSON files, the LangGraph workflow definition, retry policy, node state colors, and shortlisting rules.
Phase 4
implement the Resume Parser, Embedding (Qdrant + BAAI/bge-small-en-v1.5), Matching, Shortlisting, Interview, and Email agents with spec-driven prompts and deterministic fallback behavior when external services are unavailable.
Phase 5
implement LangGraph workflow persistence, stateful execution, human approval pause/resume, retry handling, workflow logs, and the React Flow workflow visualization.
Phase 6
implement analytics, recruiter UI polish, improved upload UX, Resend email integration, Jest/Supertest backend tests, Playwright end-to-end tests, build checks, and a full local smoke test.

Complete Specification - UI, Security, Outcome, and Codex Instructions
UI and UX Requirements
The UI must use a clean recruiter-console aesthetic with Tailwind and shadcn/ui. It must be responsive, include loading states for resume processing, render the workflow graph with React Flow, support color-coded node states (running blue, success green, failed red, waiting_approval yellow, pending neutral), surface execution order and the active node, display failed nodes, retries, and approval checkpoints, and show clear processing feedback while a candidate's upload is running through the workflow.

Security Requirements
The application must hash passwords with bcryptjs, sign and verify JWTs with JWT_SECRET, load the current user from MongoDB on every protected request, enforce recruiter route protection, validate every request body with Zod, validate resume uploads with multer (file type, size), set HTTP security headers via helmet, apply rate limiting, sanitize input, prevent NoSQL injection, and never expose secret values in logs or responses. Public candidate routes must not require recruiter authentication, but every recruiter dashboard route must be protected.

Final Expected Outcome
The completed platform must let a recruiter sign up, log in, create a Frontend Developer job, copy the public apply link, submit a demo PDF resume as a candidate, watch the AI workflow auto-start, see the workflow pause at human approval, approve the checkpoint, let the workflow complete through interview and email generation, and review candidates, workflows, and analytics. The end-to-end flow must succeed against MongoDB, Qdrant, and the configured LLM provider.

Spec Files as Source of Truth
The complete project specification is backed by concrete JSON files under /specs. These files are the business-rule contract for AgentHire.
// specs/hiring/frontend-developer.json
{
  "role": "Frontend Developer",
  "required_skills": ["React", "JavaScript", "CSS"],
  "preferred_skills": ["Next.js", "Tailwind CSS"],
  "minimum_score": 75,
  "interview_rounds": 2
}
// specs/workflow/default-hiring-workflow.json
{
  "workflow": [
    "resume_parser",
    "embedding_agent",
    "matching_agent",
    "shortlisting_agent",
    "human_approval",
    "interview_agent",
    "email_agent"
  ]
}
// specs/system/retry-policy.json
{
  "max_retries": 3,
  "retry_delay_ms": 5000
}
Codex Implementation Instructions
The AI coding agent must build the application phase by phase, follow the folder boundaries strictly (/client, /server, /specs), keep the project JavaScript only, never introduce TypeScript, NestJS, or Prisma, keep controllers thin and push business logic into services and agents, never hardcode hiring thresholds or workflow order, read all business rules from /specs, validate every API input schema with Zod, return structured JSON, persist workflow state for every run, support retries, log every workflow failure with agent name, state, stack trace, and timestamp, keep public apply routes open and recruiter routes protected, ensure that resume uploads automatically trigger the workflow, and report the important files created or changed at the end of each phase. Implementation priorities are correctness of the agent chain, integration safety, retry and approval resumability, clean architecture, and full traceability of every hiring decision back to a spec file.

====================================================================
PROJECT NAME
====================================================================

AI Recruitment Organization

====================================================================
PROJECT TYPE
====================================================================

Spec-Driven Multi-Agent Recruitment Platform

====================================================================
PRIMARY OBJECTIVE
====================================================================

Build an enterprise-style recruitment ecosystem where:

1. Recruiters create jobs and hiring specifications
2. Candidates apply through public application pages
3. AI agents analyze resumes automatically
4. AI workflows execute autonomously
5. Recruiters approve/reject AI decisions
6. RAG provides organizational intelligence
7. Workflow execution is visualized graphically

IMPORTANT:
This is NOT a chatbot project.

This IS:
- workflow orchestration
- AI automation
- RAG system
- ATS platform
- multi-agent system
- spec-driven architecture

====================================================================
IMPORTANT PROJECT STRUCTURE UPDATE
====================================================================

THE PROJECT ROOT ALREADY CONTAINS:

- client/
- server/

DO NOT CREATE:
- frontend/
- backend/

USE THE EXISTING STRUCTURE ONLY.

====================================================================
CORE ARCHITECTURAL PRINCIPLE
====================================================================

ALL BUSINESS LOGIC MUST BE SPEC-DRIVEN.

NEVER hardcode:
- hiring thresholds
- workflow steps
- scoring logic
- retry policies
- prompt templates
- evaluation rules



====================================================================
FINAL TECH STACK
====================================================================

FRONTEND
---------
Framework:
- Next.js 15 App Router

Language:
- JavaScript

Styling:
- Tailwind CSS
- shadcn/ui

State Management:
- Zustand

Forms:
- React Hook Form
- Zod

Workflow Visualization:
- React Flow

--------------------------------------------------

BACKEND
--------
Framework:
- Express.js

Runtime:
- Node.js 20+

Validation:
- Zod

Architecture:
- Modular Express Architecture

--------------------------------------------------

DATABASE
---------
Primary DB:
- MongoDB

ODM:
- Mongoose

--------------------------------------------------

VECTOR DATABASE
----------------
- Qdrant

--------------------------------------------------

AI STACK
---------
Workflow Orchestration:
- LangGraph

LLM Framework:
- LangChain

Embedding Model:
- BAAI/bge-small-en-v1.5

LLM Provider:
- Groq API Free Tier

Fallback LLM:
- OpenRouter Free Models

--------------------------------------------------

EMAIL
------
- Resend Free Tier

--------------------------------------------------

TESTING
--------
- Jest
- Supertest
- Playwright

====================================================================
LOCAL DEVELOPMENT REQUIREMENTS
====================================================================

REQUIRED SOFTWARE
-----------------
- Node.js
- MongoDB
- Docker (Recommended)
- Git
- VS Code

MINIMUM SYSTEM
--------------
- 8GB RAM
- i5/Ryzen 5

RUNNING PORTS
-------------
Frontend:
localhost:3000

Backend:
localhost:5000

MongoDB:
localhost:27017

Qdrant:
localhost:6333

====================================================================
FINAL PROJECT STRUCTURE
====================================================================

ai-recruitment-platform/
│
├── client/
│   ├── app/
│   │   ├── dashboard/
│   │   ├── jobs/
│   │   ├── auth/
│   │   └── apply/
│   │
│   ├── components/
│   ├── features/
│   ├── hooks/
│   ├── store/
│   ├── lib/
│   ├── public/
│   └── styles/
│
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── agents/
│   │   ├── workflows/
│   │   ├── rag/
│   │   ├── analytics/
│   │   ├── emails/
│   │   ├── validators/
│   │   ├── utils/
│   │   └── constants/
│   │
│   ├── uploads/
│   ├── logs/
│   └── tests/
│
├── specs/
│   ├── hiring/
│   ├── workflow/
│   ├── evaluation/
│   ├── prompts/
│   ├── email/
│   └── system/
│
├── docker/
├── docs/
├── scripts/
├── docker-compose.yml
├── README.md
└── .env

====================================================================
MANDATORY IMPLEMENTATION RULES
====================================================================

CLIENT FOLDER
--------------
The ENTIRE frontend application MUST be implemented ONLY inside:

    /client

This includes:
- Next.js app
- pages/routes
- UI components
- React Flow visualization
- Zustand store
- Tailwind setup
- shadcn/ui
- frontend API calls
- forms
- authentication UI
- recruiter dashboard
- public candidate application pages

--------------------------------------------------

SERVER FOLDER
--------------
The ENTIRE backend application MUST be implemented ONLY inside:

    /server

This includes:
- Express.js server
- APIs
- AI agents
- LangGraph workflows
- RAG implementation
- Qdrant integration
- MongoDB integration
- Mongoose models
- authentication
- file uploads
- retry logic
- workflow persistence
- logging
- email service

--------------------------------------------------

STRICT RULES
------------

1. NEVER create additional frontend/backend root folders.
2. ALWAYS use:
       /client
       /server

3. ALL frontend code MUST remain inside:
       /client

4. ALL backend code MUST remain inside:
       /server

5. Shared specs MUST remain inside:
       /specs

6. Resume uploads MUST be stored inside:
       /server/uploads

7. Workflow logs MUST be stored inside:
       /server/logs

8. Mongoose models MUST exist inside:
       /server/src/models

====================================================================
HOW THE SYSTEM WORKS
====================================================================

--------------------------------------------------
RECRUITER FLOW
--------------------------------------------------

1. Recruiter logs in
2. Recruiter creates job
3. Recruiter defines hiring specification
4. System generates public application route
5. Recruiter monitors workflows
6. Recruiter approves/rejects candidates

--------------------------------------------------
CANDIDATE FLOW
--------------------------------------------------

1. Candidate opens public apply route
2. Candidate uploads resume
3. AI workflow automatically starts
4. Candidate application gets processed

--------------------------------------------------
AI FLOW
--------------------------------------------------

Resume Upload
      ↓
Resume Parser Agent
      ↓
Embedding Agent
      ↓
Qdrant Vector Storage
      ↓
Matching Agent
      ↓
Shortlisting Agent
      ↓
Human Approval
      ↓
Interview Agent
      ↓
Email Agent
      ↓
Workflow Completed

====================================================================
FINAL MVP FEATURES
====================================================================

AUTHENTICATION
---------------
- signup
- login
- JWT auth
- role-based access

RECRUITER DASHBOARD
-------------------
- create jobs
- manage jobs
- view candidates
- workflow monitoring
- analytics

CANDIDATE PORTAL
----------------
- public application page
- resume upload
- application submission

AI AGENTS
----------
- Resume Parser Agent
- Embedding Agent
- Matching Agent
- Shortlisting Agent
- Interview Agent
- Email Agent

RAG SYSTEM
-----------
- embeddings
- semantic search
- hiring policy retrieval
- resume retrieval

WORKFLOW ENGINE
---------------
- LangGraph orchestration
- retries
- checkpoints
- resumability
- state persistence

VISUALIZATION
--------------
- workflow graph
- node states
- retries
- failures
- execution logs

ANALYTICS
----------
- candidate statistics
- shortlist rate
- workflow completion rate
- agent execution metrics

====================================================================
REQUIRED FRONTEND ROUTES
====================================================================

AUTH ROUTES
------------
/login
/signup

--------------------------------------------------

RECRUITER ROUTES
-----------------
/dashboard
/dashboard/jobs
/dashboard/jobs/create
/dashboard/candidates
/dashboard/workflows
/dashboard/analytics

--------------------------------------------------

PUBLIC CANDIDATE ROUTES
------------------------
/jobs/[jobId]
/jobs/[jobId]/apply

IMPORTANT:
Candidate routes MUST be public.
Recruiter authentication NOT required.

====================================================================
DATABASE COLLECTIONS
====================================================================

COLLECTION: users
------------------
Fields:
- id
- name
- email
- password
- role
- created_at

--------------------------------------------------

COLLECTION: jobs
-----------------
Fields:
- id
- title
- description
- required_skills
- preferred_skills
- min_experience
- workflow_spec_id
- created_at

--------------------------------------------------

COLLECTION: candidates
-----------------------
Fields:
- id
- name
- email
- phone
- resume_url
- parsed_resume_json
- match_score
- status
- created_at

--------------------------------------------------

COLLECTION: workflows
----------------------
Fields:
- id
- candidate_id
- job_id
- current_state
- status
- created_at

--------------------------------------------------

COLLECTION: workflow_logs
--------------------------
Fields:
- id
- workflow_id
- agent_name
- input
- output
- status
- error
- created_at

====================================================================
SPEC-DRIVEN DEVELOPMENT RULES
====================================================================

IMPORTANT:
NO BUSINESS RULES MAY BE HARDCODED.

ALL RULES MUST COME FROM:
    /specs

--------------------------------------------------

BAD:
if(score > 75)

GOOD:
if(score > hiringSpec.minimum_score)

====================================================================
REQUIRED SPEC FILES
====================================================================

FILE:
    /specs/hiring/frontend-developer.json

{
  "role": "Frontend Developer",
  "required_skills": [
    "React",
    "JavaScript",
    "CSS"
  ],
  "preferred_skills": [
    "Next.js",
    "Tailwind CSS"
  ],
  "minimum_score": 75,
  "interview_rounds": 2
}

--------------------------------------------------

FILE:
    /specs/workflow/default-hiring-workflow.json

{
  "workflow": [
    "resume_parser",
    "embedding_agent",
    "matching_agent",
    "shortlisting_agent",
    "human_approval",
    "interview_agent",
    "email_agent"
  ]
}

--------------------------------------------------

FILE:
    /specs/system/retry-policy.json

{
  "max_retries": 3,
  "retry_delay_ms": 5000
}

====================================================================
AI AGENT SPECIFICATIONS
====================================================================

AGENT 1:
Resume Parser Agent

Purpose:
- parse uploaded resume PDF

Input:
- PDF file

Responsibilities:
- extract skills
- extract experience
- extract education
- extract projects

Output Format:
{
  "success": true,
  "data": {
    "name": "John Doe",
    "skills": ["React", "Node.js"],
    "experience": 3,
    "education": "B.Tech"
  }
}

--------------------------------------------------

AGENT 2:
Embedding Agent

Purpose:
- generate embeddings
- store embeddings in Qdrant

Stores:
- resumes
- hiring policies
- evaluation docs

--------------------------------------------------

AGENT 3:
Matching Agent

Purpose:
- compare candidate with hiring spec

Input:
- parsed resume
- hiring spec
- retrieved RAG context

Output:
{
  "success": true,
  "data": {
    "match_score": 87,
    "missing_skills": ["TypeScript"],
    "recommendation": "Shortlist"
  }
}

--------------------------------------------------

AGENT 4:
Shortlisting Agent

Purpose:
- final AI decision engine

Rules:
>= 80 → shortlist
60-79 → hold
< 60 → reject

IMPORTANT:
Thresholds MUST come dynamically from /specs.
NEVER hardcode thresholds.

--------------------------------------------------

AGENT 5:
Interview Agent

Purpose:
- generate interview questions
- generate coding tasks
- generate evaluation rubrics

--------------------------------------------------

AGENT 6:
Email Agent

Purpose:
- send interview emails
- send rejection emails
- send reminders

====================================================================
RAG IMPLEMENTATION SPEC
====================================================================

RAG PURPOSE
------------
Provide organizational intelligence to AI agents.

DATA SOURCES
-------------
- resumes
- hiring policies
- evaluation docs
- interview guidelines

--------------------------------------------------

RAG PIPELINE
-------------

Documents
    ↓
Chunking
    ↓
Embeddings
    ↓
Qdrant Storage
    ↓
Similarity Search
    ↓
Context Injection
    ↓
LLM Response

--------------------------------------------------

CHUNKING RULES
---------------

Resume chunks:
- 500 chars

Policy chunks:
- 1000 chars

--------------------------------------------------

SIMILARITY SEARCH
------------------

Top K:
- 5

Minimum similarity:
- 0.75

====================================================================
LANGGRAPH WORKFLOW SPEC
====================================================================

MAIN WORKFLOW
--------------

Resume Upload
      ↓
Resume Parser Agent
      ↓
Embedding Agent
      ↓
Matching Agent
      ↓
Shortlisting Agent
      ↓
Human Approval
      ↓
Interview Agent
      ↓
Email Agent
      ↓
Workflow Completed

--------------------------------------------------

LANGGRAPH REQUIREMENTS
----------------------

Must support:
- retries
- checkpoints
- resumability
- state persistence
- branching
- human approval pauses

====================================================================
WORKFLOW VISUALIZATION SPEC
====================================================================

Use:
- React Flow

--------------------------------------------------

NODE STATES
------------

Running:
- blue

Success:
- green

Failed:
- red

Waiting Approval:
- yellow

--------------------------------------------------

MUST DISPLAY
------------

- execution order
- active node
- failed nodes
- retries
- approval checkpoints

====================================================================
API REQUIREMENTS
====================================================================

AUTH
-----
POST /auth/signup
POST /auth/login
GET  /auth/me

--------------------------------------------------

JOBS
-----
POST /jobs
GET  /jobs
GET  /jobs/:id
PUT  /jobs/:id

--------------------------------------------------

CANDIDATES
-----------
POST /candidates/upload
GET  /candidates
GET  /candidates/:id

--------------------------------------------------

WORKFLOWS
----------
POST /workflow/start
POST /workflow/retry
POST /workflow/approve
GET  /workflow/:id

====================================================================
SECURITY REQUIREMENTS
====================================================================

MANDATORY SECURITY
-------------------

- JWT auth
- bcryptjs password hashing
- helmet middleware
- rate limiting
- file validation
- input sanitization
- NoSQL injection prevention

====================================================================
TESTING REQUIREMENTS
====================================================================

UNIT TESTS
------------
Test:
- scoring logic
- validators
- helper functions

--------------------------------------------------

AGENT TESTS
------------

Verify:
- valid JSON outputs
- deterministic outputs
- retry handling

--------------------------------------------------

RAG TESTS
-----------

Verify:
- correct retrieval
- semantic relevance
- low hallucination

--------------------------------------------------

WORKFLOW TESTS
---------------

Verify:
- execution order
- retries
- state persistence
- approval pauses

--------------------------------------------------

END-TO-END TEST
----------------

Flow:
Create Job
    ↓
Open Apply Page
    ↓
Upload Resume
    ↓
Run Workflow
    ↓
Shortlist Candidate
    ↓
Send Email

====================================================================
IMPORTANT TESTING UNDERSTANDING
====================================================================

During local development:

YOU simulate ALL actors yourself.

You act as:
- recruiter
- candidate
- HR reviewer
- system tester

--------------------------------------------------
LOCAL TESTING FLOW
--------------------------------------------------

STEP 1:
Open recruiter dashboard

Example:
http://localhost:3000/dashboard

STEP 2:
Create hiring job

STEP 3:
System generates public apply page

Example:
http://localhost:3000/jobs/123/apply

STEP 4:
Open apply page manually

STEP 5:
Upload sample resume yourself

Example:
john-react-resume.pdf

STEP 6:
AI workflow automatically executes

THIS IS HOW PROFESSIONAL MULTI-USER SYSTEMS
ARE TESTED LOCALLY.

====================================================================
FAILURE HANDLING REQUIREMENTS
====================================================================

RETRYABLE FAILURES
-------------------

- LLM timeout
- email API failure
- vector DB timeout

--------------------------------------------------

NON-RETRYABLE FAILURES
-----------------------

- invalid PDF
- malformed JSON
- invalid request schema

--------------------------------------------------

EVERY FAILURE MUST LOG
-----------------------

- agent name
- workflow state
- stack trace
- timestamp

====================================================================
DOCKER REQUIREMENTS
====================================================================

Docker is RECOMMENDED but NOT mandatory.

USE Docker mainly for:
- MongoDB
- Qdrant

--------------------------------------------------

RECOMMENDED DEVELOPMENT FLOW
----------------------------

Docker:
- MongoDB
- Qdrant

Manual:
- client
- server

--------------------------------------------------

QDRANT COMMAND
---------------

docker run -p 6333:6333 qdrant/qdrant

====================================================================
ENVIRONMENT VARIABLES
====================================================================

CLIENT/.env.local
------------------

NEXT_PUBLIC_API_URL=http://localhost:5000

--------------------------------------------------

SERVER/.env
------------

PORT=5000

MONGODB_URI=

JWT_SECRET=

GROQ_API_KEY=

OPENROUTER_API_KEY=

QDRANT_URL=http://localhost:6333

RESEND_API_KEY=

====================================================================
IMPLEMENTATION RULES FOR CODEX
====================================================================

STRICT RULES
-------------

1. USE JavaScript ONLY.
2. DO NOT use TypeScript anywhere.
3. USE Express.js backend ONLY.
4. USE MongoDB + Mongoose ONLY.
5. NEVER create NestJS structure.
6. NEVER create Prisma schema.
7. USE modular Express architecture.
8. ALL frontend code MUST remain inside /client.
9. ALL backend code MUST remain inside /server.
10. NEVER hardcode business logic.
11. ALWAYS read logic from /specs.
12. ALWAYS validate API input schemas.
13. ALWAYS return structured JSON.
14. ALWAYS persist workflow state.
15. ALWAYS support retries.
16. ALWAYS log workflow failures.
17. ALWAYS use deterministic prompts.
18. NEVER tightly couple agents.
19. NEVER skip validation.
20. PUBLIC APPLY ROUTES MUST WORK WITHOUT LOGIN.
21. RECRUITER DASHBOARD MUST REQUIRE AUTH.
22. RESUME UPLOAD MUST AUTOMATICALLY TRIGGER WORKFLOW.
23. ALL AGENT OUTPUTS MUST BE JSON SERIALIZABLE.
24. ALL WORKFLOW STATES MUST BE TRACKABLE.

====================================================================
SUCCESS CRITERIA
====================================================================

PROJECT IS SUCCESSFUL IF:

- recruiter can create jobs
- candidate can apply publicly
- resume uploads successfully
- AI parses resumes correctly
- RAG retrieves relevant knowledge
- workflows execute autonomously
- recruiter can approve AI decisions
- workflow graph visualizes execution
- retries recover failures
- specs control all business logic

====================================================================
FINAL END-TO-END FLOW
====================================================================

Recruiter Creates Job
        ↓
Hiring Spec Loaded
        ↓
System Generates Public Apply Route
        ↓
Candidate Uploads Resume
        ↓
Resume Parser Agent
        ↓
Embedding Agent
        ↓
Qdrant Storage
        ↓
Matching Agent
        ↓
Shortlisting Agent
        ↓
Human Approval
        ↓
Interview Agent
        ↓
Email Agent
        ↓
Workflow Completed

====================================================================
END OF FINAL IMPLEMENTATION SPEC
====================================================================

Where Each Specification Parameter Shows Up
Looking at the spec above, you can see how the parameters of a good specification appear in practice.

The Project Overview and Final Expected Outcome sections demonstrate clarity, because they describe the product in single-meaning sentences and name the users - recruiter and candidate - along with the core motion: create job, apply, upload resume, run AI workflow, pause for human approval, complete the hiring decision.

Completeness comes from the combination of stack, authentication, jobs, candidates, agents, RAG, LangGraph workflow, database collections, API endpoints, UI pages, folder structure, security, environment variables, testing, and verification. There is no major area left undefined.

Consistency is visible in the way agent names are reused across the workflow spec, backend services, logs, and the React Flow visualization: resume_parser, embedding_agent, matching_agent, shortlisting_agent, human_approval, interview_agent, and email_agent appear identically on Slide 7, Slide 8, Slide 10, and Slide 14.

The Tech Stack section locks down concrete technology choices - Next.js 15 App Router, JavaScript only, Tailwind, shadcn/ui, Zustand, React Hook Form, Zod, React Flow, Express.js, MongoDB, Mongoose, JWT, bcryptjs, multer, LangGraph, LangChain, BAAI/bge-small-en-v1.5, Qdrant, Groq primary with OpenRouter fallback, and Resend - instead of leaving them open to interpretation.

The whole document is laid out under structured sections with clear headings, which makes it easy for both a human reader and an AI agent to scan.

The Development Phases section enforces phased delivery, breaking a large build into six reviewable checkpoints, each ending in a runnable surface (auth shell, jobs and candidate uploads, spec loader, agents, LangGraph + approval pause, analytics and end-to-end tests).

And the language throughout uses an authoritative tone - "must", "should", "do not", and "never hardcode" - instead of soft suggestions that an AI might silently drop. Statements like "Thresholds MUST come dynamically from /specs. NEVER hardcode thresholds." give the agent no wiggle room.