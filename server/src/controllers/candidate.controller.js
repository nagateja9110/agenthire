const candidateService = require('../services/candidate.service');
const workflowService = require('../services/workflow.service');
const { ok, fail } = require('../utils/response');
const { uploadCandidateSchema } = require('../validators/candidate.schema');

async function upload(req, res) {
  if (!req.file) return fail(res, 400, 'A PDF resume file is required (field name: resume)');

  const parsed = uploadCandidateSchema.safeParse(req.body);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
    return fail(res, 400, 'Validation failed', details);
  }

  const { candidate, job, resumeText } = await candidateService.createApplication({
    ...parsed.data,
    filePath: req.file.path,
    resumeUrl: `/uploads/${req.file.filename}`,
  });

  // Resume upload always auto-starts the workflow - no recruiter action needed.
  const workflow = await workflowService.startWorkflow({ candidate, job, resumeText });

  return ok(
    res,
    {
      candidate_id: candidate._id,
      workflow_id: workflow._id,
      workflow_status: workflow.status,
      current_state: workflow.current_state,
    },
    201
  );
}

async function list(req, res) {
  const result = await candidateService.listCandidates(req.validatedQuery, req.user._id);
  return ok(res, result);
}

async function getOne(req, res) {
  const candidate = await candidateService.getCandidate(req.params.id, req.user._id);
  return ok(res, { candidate });
}

module.exports = { upload, list, getOne };
