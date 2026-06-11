const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { uploadLimiter } = require('../middleware/rateLimiters');
const { listCandidatesQuerySchema } = require('../validators/candidate.schema');
const controller = require('../controllers/candidate.controller');
const { ROLES } = require('../constants');

const router = Router();

// Public: candidates apply without authentication. Upload auto-starts the workflow.
router.post('/upload', uploadLimiter, upload.single('resume'), asyncHandler(controller.upload));

router.get(
  '/',
  requireAuth,
  requireRole(ROLES.RECRUITER),
  validate(listCandidatesQuerySchema, 'query'),
  asyncHandler(controller.list)
);
router.get('/:id', requireAuth, requireRole(ROLES.RECRUITER), asyncHandler(controller.getOne));

module.exports = router;
