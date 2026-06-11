const workflowService = require('../services/workflow.service');
const { ok } = require('../utils/response');

async function start(req, res) {
  const workflow = await workflowService.startById(req.body.candidate_id, req.user._id);
  return ok(res, { workflow_id: workflow._id, status: workflow.status }, 201);
}

async function retry(req, res) {
  const workflow = await workflowService.retryWorkflow(req.body.workflow_id, req.user._id);
  return ok(res, { workflow_id: workflow._id, status: workflow.status });
}

async function approve(req, res) {
  const workflow = await workflowService.approveWorkflow(
    req.body.workflow_id,
    req.body.decision,
    req.user._id
  );
  return ok(res, {
    workflow_id: workflow._id,
    status: workflow.status,
    current_state: workflow.current_state,
    decision: req.body.decision,
  });
}

async function list(req, res) {
  const result = await workflowService.listWorkflows(req.validatedQuery, req.user._id);
  return ok(res, result);
}

async function getOne(req, res) {
  const result = await workflowService.getWorkflowDetail(req.params.id, req.user._id);
  return ok(res, result);
}

module.exports = { start, retry, approve, list, getOne };
