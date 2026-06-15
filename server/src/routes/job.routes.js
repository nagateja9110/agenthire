const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const { requireAuth, requireRole, optionalAuth } = require('../middleware/auth');
const { createJobSchema, updateJobSchema, listQuerySchema } = require('../validators/job.schema');
const controller = require('../controllers/job.controller');
const { ROLES } = require('../constants');

const router = Router();

router.post(
  '/',
  requireAuth,
  requireRole(ROLES.RECRUITER),
  validate(createJobSchema),
  asyncHandler(controller.create)
);
router.get('/', optionalAuth, validate(listQuerySchema, 'query'), asyncHandler(controller.list));
router.get('/:id', asyncHandler(controller.getOne));
router.put(
  '/:id',
  requireAuth,
  requireRole(ROLES.RECRUITER),
  validate(updateJobSchema),
  asyncHandler(controller.update)
);
router.delete('/:id', requireAuth, requireRole(ROLES.RECRUITER), asyncHandler(controller.remove));

module.exports = router;
