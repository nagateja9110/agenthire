const { StateGraph, Annotation, START, END, interrupt } = require('@langchain/langgraph');
const { MongoDBSaver } = require('@langchain/langgraph-checkpoint-mongodb');
const mongoose = require('mongoose');

const Workflow = require('../models/Workflow');
const WorkflowLog = require('../models/WorkflowLog');
const Candidate = require('../models/Candidate');
const { AGENTS, WORKFLOW_STATUS, LOG_STATUS, CANDIDATE_STATUS } = require('../constants');
const { logWorkflowFailure } = require('../utils/logger');

const { runResumeParser } = require('../agents/resumeParser.agent');
const { runEmbeddingAgent } = require('../agents/embedding.agent');
const { runMatchingAgent } = require('../agents/matching.agent');
const { runShortlistingAgent } = require('../agents/shortlisting.agent');
const { runInterviewAgent } = require('../agents/interview.agent');
const { runEmailAgent } = require('../agents/email.agent');
const { createSession } = require('../services/interviewSession.service');

const HiringState = Annotation.Root({
  workflow_id: Annotation,
  candidate_id: Annotation,
  job_id: Annotation,
  resume_text: Annotation,
  job: Annotation,
  hiring_spec: Annotation,
  spec_snapshot: Annotation,
  parsed_resume: Annotation,
  embedding_result: Annotation,
  match_result: Annotation,
  shortlist: Annotation,
  approval: Annotation,
  outcome: Annotation,
  interview: Annotation,
  email_result: Annotation,
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Wraps an agent as a graph node: logs to workflow_logs, updates the
 * workflow document, and applies the retry policy from the spec snapshot.
 * Only errors flagged retryable are retried; everything else fails fast.
 */
function makeNode(agentName, agentFn, { logInput } = {}) {
  return async function node(state) {
    const retryPolicy = state.spec_snapshot.retry_policy;
    const workflowId = state.workflow_id;

    await Workflow.updateOne(
      { _id: workflowId },
      { current_state: agentName, status: WORKFLOW_STATUS.RUNNING }
    );

    const input = logInput ? logInput(state) : null;
    let lastError = null;

    for (let attempt = 1; attempt <= 1 + retryPolicy.max_retries; attempt += 1) {
      const log = await WorkflowLog.create({
        workflow_id: workflowId,
        agent_name: agentName,
        input,
        status: LOG_STATUS.RUNNING,
        attempt,
      });
      const startedAt = Date.now();
      try {
        const update = await agentFn(state);
        await WorkflowLog.updateOne(
          { _id: log._id },
          { status: LOG_STATUS.SUCCESS, output: update.output, duration_ms: Date.now() - startedAt }
        );
        await Workflow.updateOne(
          { _id: workflowId },
          {
            $set: { [`state_output.${agentName}`]: update.output },
            ...(attempt > 1 ? { [`retries.${agentName}`]: attempt - 1 } : {}),
          }
        );
        return update.state || {};
      } catch (err) {
        lastError = err;
        await WorkflowLog.updateOne(
          { _id: log._id },
          { status: LOG_STATUS.FAILED, error: err.message, duration_ms: Date.now() - startedAt }
        );
        await Workflow.updateOne(
          { _id: workflowId },
          { $set: { [`retries.${agentName}`]: attempt - 1 } }
        );
        logWorkflowFailure({ workflowId, agentName, state: agentName, error: err });
        const isLastAttempt = attempt === 1 + retryPolicy.max_retries;
        if (!err.retryable || isLastAttempt) break;
        await sleep(retryPolicy.retry_delay_ms);
      }
    }

    await Workflow.updateOne(
      { _id: workflowId },
      { status: WORKFLOW_STATUS.FAILED, error: `${agentName}: ${lastError.message}` }
    );
    throw lastError;
  };
}

const resumeParserNode = makeNode(
  AGENTS.RESUME_PARSER,
  async (state) => {
    const parsed = await runResumeParser({
      resumeText: state.resume_text,
      job: state.job,
      candidate: await Candidate.findById(state.candidate_id),
    });
    await Candidate.updateOne(
      { _id: state.candidate_id },
      { parsed_resume_json: parsed, status: CANDIDATE_STATUS.PROCESSING }
    );
    return { output: parsed, state: { parsed_resume: parsed } };
  },
  { logInput: (state) => ({ resume_chars: (state.resume_text || '').length }) }
);

const embeddingNode = makeNode(
  AGENTS.EMBEDDING_AGENT,
  async (state) => {
    const result = await runEmbeddingAgent({
      candidateId: state.candidate_id,
      resumeText: state.resume_text,
    });
    return { output: result, state: { embedding_result: result } };
  },
  { logInput: (state) => ({ candidate_id: state.candidate_id }) }
);

const matchingNode = makeNode(
  AGENTS.MATCHING_AGENT,
  async (state) => {
    const result = await runMatchingAgent({
      parsedResume: state.parsed_resume,
      job: state.job,
      hiringSpec: state.hiring_spec,
    });
    await Candidate.updateOne({ _id: state.candidate_id }, { match_score: result.match_score });
    return { output: result, state: { match_result: result } };
  },
  { logInput: (state) => ({ skills: state.parsed_resume && state.parsed_resume.skills }) }
);

const shortlistingNode = makeNode(
  AGENTS.SHORTLISTING_AGENT,
  async (state) => {
    const result = runShortlistingAgent({
      matchScore: state.match_result.match_score,
      shortlistingRules: state.spec_snapshot.shortlisting_rules,
      hiringSpec: state.hiring_spec,
    });
    await Candidate.updateOne({ _id: state.candidate_id }, { status: result.decision });
    const update = { shortlist: result };
    if (result.decision === 'rejected') update.outcome = 'rejected';
    return { output: result, state: update };
  },
  { logInput: (state) => ({ match_score: state.match_result && state.match_result.match_score }) }
);

/**
 * Human approval checkpoint. First execution marks the workflow
 * waiting_approval and interrupts; the approve endpoint persists the
 * decision and resumes, at which point this node re-runs and reads it.
 */
async function humanApprovalNode(state) {
  const workflow = await Workflow.findById(state.workflow_id);

  if (!workflow.approval || !workflow.approval.decision) {
    await Workflow.updateOne(
      { _id: state.workflow_id },
      { current_state: AGENTS.HUMAN_APPROVAL, status: WORKFLOW_STATUS.WAITING_APPROVAL }
    );
    const alreadyWaiting = await WorkflowLog.exists({
      workflow_id: state.workflow_id,
      agent_name: AGENTS.HUMAN_APPROVAL,
      status: LOG_STATUS.WAITING_APPROVAL,
    });
    if (!alreadyWaiting) {
      await WorkflowLog.create({
        workflow_id: state.workflow_id,
        agent_name: AGENTS.HUMAN_APPROVAL,
        input: { shortlist_decision: state.shortlist && state.shortlist.decision },
        status: LOG_STATUS.WAITING_APPROVAL,
      });
    }
    interrupt({ awaiting: 'recruiter_decision' });
  }

  const decision = workflow.approval.decision;
  const output = { decision, decided_by: workflow.approval.decided_by, decided_at: workflow.approval.decided_at };

  await WorkflowLog.create({
    workflow_id: state.workflow_id,
    agent_name: AGENTS.HUMAN_APPROVAL,
    status: LOG_STATUS.SUCCESS,
    output,
  });
  await Workflow.updateOne(
    { _id: state.workflow_id },
    { status: WORKFLOW_STATUS.RUNNING, $set: { [`state_output.${AGENTS.HUMAN_APPROVAL}`]: output } }
  );
  if (decision === 'rejected') {
    await Candidate.updateOne({ _id: state.candidate_id }, { status: CANDIDATE_STATUS.REJECTED });
  }
  return { approval: decision, outcome: decision };
}

const interviewNode = makeNode(
  AGENTS.INTERVIEW_AGENT,
  async (state) => {
    const result = await runInterviewAgent({
      hiringSpec: state.hiring_spec,
      job: state.job,
      matchedSkills: [
        ...(state.match_result.matched_required || []),
        ...(state.match_result.matched_preferred || []),
      ],
      experience: state.parsed_resume && state.parsed_resume.experience,
    });
    return { output: result, state: { interview: result } };
  },
  { logInput: (state) => ({ outcome: state.outcome }) }
);

const emailNode = makeNode(
  AGENTS.EMAIL_AGENT,
  async (state) => {
    const candidate = await Candidate.findById(state.candidate_id);

    // Approved candidates get a one-time voice-interview link in the invite.
    // Gated here by the human approval checkpoint - nobody else receives one.
    let interviewLink = null;
    if (state.outcome === 'approved' && state.interview && state.interview.questions) {
      const created = await createSession({
        candidate,
        job: { _id: state.job_id, ...state.job },
        hiringSpec: state.hiring_spec,
        workflowId: state.workflow_id,
        questions: state.interview.questions,
        rubric: state.interview.rubric,
        codingTasks: state.interview.coding_tasks,
      });
      interviewLink = created && created.link;
    }

    const result = await runEmailAgent({
      outcome: state.outcome,
      candidate,
      hiringSpec: state.hiring_spec,
      job: state.job,
      matchScore: state.match_result && state.match_result.match_score,
      interviewLink,
    });
    if (state.outcome === 'approved') {
      await Candidate.updateOne({ _id: state.candidate_id }, { status: CANDIDATE_STATUS.INVITED });
    }
    await Workflow.updateOne(
      { _id: state.workflow_id },
      {
        status: WORKFLOW_STATUS.COMPLETED,
        current_state: AGENTS.EMAIL_AGENT,
        completed_at: new Date(),
      }
    );
    return { output: result, state: { email_result: result } };
  },
  { logInput: (state) => ({ outcome: state.outcome }) }
);

function routeAfterShortlisting(state) {
  return state.shortlist.decision === 'rejected' ? AGENTS.EMAIL_AGENT : AGENTS.HUMAN_APPROVAL;
}

function routeAfterApproval(state) {
  return state.outcome === 'approved' ? AGENTS.INTERVIEW_AGENT : AGENTS.EMAIL_AGENT;
}

let compiledGraph = null;

function getCompiledGraph() {
  if (compiledGraph) return compiledGraph;

  const checkpointer = new MongoDBSaver({
    client: mongoose.connection.getClient(),
    dbName: mongoose.connection.name,
  });

  const graph = new StateGraph(HiringState)
    .addNode(AGENTS.RESUME_PARSER, resumeParserNode)
    .addNode(AGENTS.EMBEDDING_AGENT, embeddingNode)
    .addNode(AGENTS.MATCHING_AGENT, matchingNode)
    .addNode(AGENTS.SHORTLISTING_AGENT, shortlistingNode)
    .addNode(AGENTS.HUMAN_APPROVAL, humanApprovalNode)
    .addNode(AGENTS.INTERVIEW_AGENT, interviewNode)
    .addNode(AGENTS.EMAIL_AGENT, emailNode)
    .addEdge(START, AGENTS.RESUME_PARSER)
    .addEdge(AGENTS.RESUME_PARSER, AGENTS.EMBEDDING_AGENT)
    .addEdge(AGENTS.EMBEDDING_AGENT, AGENTS.MATCHING_AGENT)
    .addEdge(AGENTS.MATCHING_AGENT, AGENTS.SHORTLISTING_AGENT)
    .addConditionalEdges(AGENTS.SHORTLISTING_AGENT, routeAfterShortlisting, [
      AGENTS.HUMAN_APPROVAL,
      AGENTS.EMAIL_AGENT,
    ])
    .addConditionalEdges(AGENTS.HUMAN_APPROVAL, routeAfterApproval, [
      AGENTS.INTERVIEW_AGENT,
      AGENTS.EMAIL_AGENT,
    ])
    .addEdge(AGENTS.INTERVIEW_AGENT, AGENTS.EMAIL_AGENT)
    .addEdge(AGENTS.EMAIL_AGENT, END);

  compiledGraph = graph.compile({ checkpointer });
  return compiledGraph;
}

function resetCompiledGraph() {
  compiledGraph = null;
}

module.exports = { getCompiledGraph, resetCompiledGraph, HiringState };
