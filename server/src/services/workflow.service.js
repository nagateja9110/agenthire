const path = require('path');
const { Command } = require('@langchain/langgraph');
const Workflow = require('../models/Workflow');
const WorkflowLog = require('../models/WorkflowLog');
const Candidate = require('../models/Candidate');
const Job = require('../models/Job');
const { getCompiledGraph } = require('../workflows/hiringWorkflow');
const { specs } = require('../utils/specLoader');
const { ApiError } = require('../utils/errors');
const { WORKFLOW_STATUS, LOG_STATUS, CANDIDATE_STATUS, AGENTS } = require('../constants');
const { info } = require('../utils/logger');

/**
 * Resolves every governing spec value at start time and freezes it into
 * the workflow document, so in-flight runs are immune to later spec edits.
 */
function buildSpecSnapshot(job) {
  let hiringSpec;
  try {
    hiringSpec = specs.hiring(job.hiring_spec_id);
  } catch (err) {
    hiringSpec = specs.hiring('frontend-developer');
  }
  const workflowSpec = specs.workflow(job.workflow_spec_id || 'default-hiring-workflow');

  if (typeof job.minimum_score === 'number') {
    hiringSpec = { ...hiringSpec, minimum_score: job.minimum_score };
  }

  let shortlistingRules = specs.shortlistingRules();
  if (typeof job.hold_min === 'number') {
    shortlistingRules = { ...shortlistingRules, hold_min: job.hold_min };
  }

  return {
    hiring_spec: hiringSpec,
    workflow: workflowSpec.workflow,
    shortlisting_rules: shortlistingRules,
    matching_weights: specs.matchingAgentPrompt().weights,
    retry_policy: specs.retryPolicy(),
    rag: specs.ragRetrieval(),
    snapshotted_at: new Date().toISOString(),
  };
}

function threadConfig(workflowId) {
  return { configurable: { thread_id: String(workflowId) } };
}

async function executeGraph(workflowId, input) {
  const graph = getCompiledGraph();
  try {
    await graph.invoke(input, threadConfig(workflowId));
  } catch (err) {
    // Node wrapper already logged and marked the workflow failed;
    // this catch keeps the background runner from crashing the process.
    info(`Workflow ${workflowId} stopped: ${err.message}`);
    try {
      await Workflow.updateOne(
        { _id: workflowId, status: { $nin: [WORKFLOW_STATUS.FAILED, WORKFLOW_STATUS.COMPLETED] } },
        { status: WORKFLOW_STATUS.FAILED, error: err.message }
      );
    } catch (updateErr) {
      info(`Could not mark workflow ${workflowId} failed: ${updateErr.message}`);
    }
  }
}

async function startWorkflow({ candidate, job, resumeText }) {
  const snapshot = buildSpecSnapshot(job);

  const workflow = await Workflow.create({
    candidate_id: candidate._id,
    job_id: job._id,
    status: WORKFLOW_STATUS.PENDING,
    current_state: null,
    spec_snapshot: snapshot,
  });

  candidate.workflow_id = workflow._id;
  candidate.status = CANDIDATE_STATUS.PROCESSING;
  await candidate.save();

  const initialState = {
    workflow_id: String(workflow._id),
    candidate_id: String(candidate._id),
    job_id: String(job._id),
    resume_text: resumeText,
    job: {
      title: job.title,
      required_skills: job.required_skills,
      preferred_skills: job.preferred_skills,
      min_experience: job.min_experience,
    },
    hiring_spec: snapshot.hiring_spec,
    spec_snapshot: snapshot,
    approval: null,
  };

  workflow.status = WORKFLOW_STATUS.RUNNING;
  await workflow.save();

  // Run in the background - the upload response returns immediately
  // and the UI polls workflow status.
  setImmediate(() => executeGraph(workflow._id, initialState));

  return workflow;
}

async function assertOwnership(workflow, userId) {
  const job = await Job.findById(workflow.job_id);
  if (!job || job.created_by.toString() !== userId.toString()) {
    throw new ApiError(403, 'Not your workflow');
  }
  return job;
}

async function startById(candidateId, userId) {
  const candidate = await Candidate.findById(candidateId);
  if (!candidate) throw new ApiError(404, 'Candidate not found');
  const job = await Job.findById(candidate.job_id);
  if (!job || job.created_by.toString() !== userId.toString()) {
    throw new ApiError(403, 'Not your candidate');
  }
  if (candidate.workflow_id) {
    const existing = await Workflow.findById(candidate.workflow_id);
    if (
      existing &&
      [WORKFLOW_STATUS.PENDING, WORKFLOW_STATUS.RUNNING, WORKFLOW_STATUS.WAITING_APPROVAL].includes(
        existing.status
      )
    ) {
      throw new ApiError(409, 'A workflow is already active for this candidate');
    }
  }
  const { extractPdfText } = require('./candidate.service');
  const filePath = path.join(__dirname, '../../', candidate.resume_url);
  const resumeText = await extractPdfText(filePath);
  return startWorkflow({ candidate, job, resumeText });
}

async function approveWorkflow(workflowId, decision, userId) {
  const workflow = await Workflow.findById(workflowId);
  if (!workflow) throw new ApiError(404, 'Workflow not found');
  await assertOwnership(workflow, userId);

  if (workflow.status !== WORKFLOW_STATUS.WAITING_APPROVAL) {
    throw new ApiError(409, `Workflow is not waiting for approval (status: ${workflow.status})`);
  }

  workflow.approval = { decision, decided_by: userId, decided_at: new Date() };
  workflow.status = WORKFLOW_STATUS.RUNNING;
  await workflow.save();

  // Resume the graph from the human_approval interrupt.
  setImmediate(() => executeGraph(workflow._id, new Command({ resume: decision })));

  return workflow;
}

async function retryWorkflow(workflowId, userId) {
  const workflow = await Workflow.findById(workflowId);
  if (!workflow) throw new ApiError(404, 'Workflow not found');
  await assertOwnership(workflow, userId);

  if (workflow.status !== WORKFLOW_STATUS.FAILED) {
    throw new ApiError(409, `Only failed workflows can be retried (status: ${workflow.status})`);
  }

  workflow.status = WORKFLOW_STATUS.RUNNING;
  workflow.error = null;
  await workflow.save();

  // Re-invoke from the last checkpoint: the failed node runs again.
  setImmediate(() => executeGraph(workflow._id, null));

  return workflow;
}

async function listWorkflows({ page, limit, status }, userId) {
  const ownJobIds = await Job.find({ created_by: userId }).distinct('_id');
  const filter = { job_id: { $in: ownJobIds } };
  if (status) filter.status = status;

  const [items, total] = await Promise.all([
    Workflow.find(filter)
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('candidate_id', 'name email match_score status')
      .populate('job_id', 'title'),
    Workflow.countDocuments(filter),
  ]);
  return { items, total, page, limit };
}

function computeNodeStates(workflow, logs) {
  const order = (workflow.spec_snapshot && workflow.spec_snapshot.workflow) || [];
  const latestByAgent = {};
  for (const log of logs) {
    latestByAgent[log.agent_name] = log; // logs sorted ascending; last wins
  }
  return order.map((agent, index) => {
    const log = latestByAgent[agent];
    let state = 'pending';
    if (log) {
      if (log.status === LOG_STATUS.SUCCESS) state = 'success';
      else if (log.status === LOG_STATUS.FAILED) state = 'failed';
      else if (log.status === LOG_STATUS.WAITING_APPROVAL) state = 'waiting_approval';
      else if (log.status === LOG_STATUS.RUNNING) state = 'running';
    }
    // Skipped branches (e.g. interview after rejection) stay pending.
    return {
      agent,
      order: index + 1,
      state,
      attempts: log ? log.attempt : 0,
      duration_ms: log ? log.duration_ms : null,
    };
  });
}

async function getWorkflowDetail(id, userId) {
  const workflow = await Workflow.findById(id)
    .populate('candidate_id', 'name email phone match_score status parsed_resume_json')
    .populate('job_id', 'title required_skills preferred_skills min_experience created_by');
  if (!workflow) throw new ApiError(404, 'Workflow not found');
  if (workflow.job_id.created_by.toString() !== userId.toString()) {
    throw new ApiError(403, 'Not your workflow');
  }

  const logs = await WorkflowLog.find({ workflow_id: id }).sort({ created_at: 1 });
  const nodeStates = computeNodeStates(workflow, logs);
  const nodeStateColors = specs.nodeStates();

  return {
    workflow,
    logs,
    node_states: nodeStates,
    node_state_colors: nodeStateColors,
    execution_order: (workflow.spec_snapshot && workflow.spec_snapshot.workflow) || [],
  };
}

/**
 * Startup sweep: workflows that were mid-run when the process died are
 * resumed from their last MongoDB checkpoint.
 */
async function resumeInFlightWorkflows() {
  const stale = await Workflow.find({ status: WORKFLOW_STATUS.RUNNING });
  for (const workflow of stale) {
    info(`Resuming in-flight workflow ${workflow._id} from checkpoint`);
    const input = workflow.approval && workflow.approval.decision
      ? new Command({ resume: workflow.approval.decision })
      : null;
    setImmediate(() => executeGraph(workflow._id, input));
  }
  return stale.length;
}

module.exports = {
  startWorkflow,
  startById,
  approveWorkflow,
  retryWorkflow,
  listWorkflows,
  getWorkflowDetail,
  resumeInFlightWorkflows,
  buildSpecSnapshot,
  computeNodeStates,
};
