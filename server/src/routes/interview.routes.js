const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimiters');
const { audioUpload } = require('../middleware/upload');
const { answerSchema, codeSchema } = require('../validators/interview.schema');
const controller = require('../controllers/interview.controller');
const { ROLES } = require('../constants');

const router = Router();

// Public candidate interview routes (token is the auth - no login).
router.get('/:token', asyncHandler(controller.getSession));
router.post('/:token/answer', validate(answerSchema), asyncHandler(controller.answer));
router.post('/:token/run', uploadLimiter, validate(codeSchema), asyncHandler(controller.runCode));
router.post('/:token/code', validate(codeSchema), asyncHandler(controller.submitCode));
router.post('/:token/complete', uploadLimiter, asyncHandler(controller.complete));
router.post('/:token/speak', uploadLimiter, asyncHandler(controller.speak));
router.post('/:token/transcribe', uploadLimiter, audioUpload.single('audio'), asyncHandler(controller.transcribe));

module.exports = router;

// Recruiter review route is mounted separately under /candidates.
module.exports.recruiterReview = [
  requireAuth,
  requireRole(ROLES.RECRUITER),
  asyncHandler(controller.review),
];
