const interviewService = require('../services/interviewSession.service');
const { ok } = require('../utils/response');

async function getSession(req, res) {
  return ok(res, await interviewService.getPublic(req.params.token));
}

async function answer(req, res) {
  const result = await interviewService.submitAnswer(req.params.token, {
    answer: req.body.answer,
    mode: req.body.mode,
  });
  return ok(res, result);
}

async function complete(req, res) {
  const result = await interviewService.completeAndEvaluate(req.params.token);
  // Candidate sees only a thank-you confirmation, not the evaluation.
  return ok(res, { status: result.status, completed_at: result.completed_at });
}

// Recruiter-only review of a candidate's interview.
async function review(req, res) {
  return ok(res, await interviewService.getReviewForCandidate(req.params.id, req.user._id));
}

module.exports = { getSession, answer, complete, review };
