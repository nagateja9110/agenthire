const jobService = require('../services/job.service');
const { ok } = require('../utils/response');

async function create(req, res) {
  const job = await jobService.createJob(req.body, req.user._id);
  return ok(res, { job }, 201);
}

async function list(req, res) {
  const query = req.validatedQuery || { page: 1, limit: 20 };
  // Scoped to the recruiter when authenticated and ?mine=true; public browse otherwise.
  const scopeToUser = req.user && req.query.mine === 'true' ? req.user._id : null;
  const result = await jobService.listJobs(query, scopeToUser);
  return ok(res, result);
}

async function getOne(req, res) {
  const job = await jobService.getJob(req.params.id);
  return ok(res, { job });
}

async function update(req, res) {
  const job = await jobService.updateJob(req.params.id, req.body, req.user._id);
  return ok(res, { job });
}

async function remove(req, res) {
  await jobService.deleteJob(req.params.id, req.user._id);
  return ok(res, { deleted: true });
}

module.exports = { create, list, getOne, update, remove };
