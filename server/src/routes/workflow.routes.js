const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  startWorkflowSchema,
  retryWorkflowSchema,
  approveWorkflowSchema,
  listWorkflowsQuerySchema,
} = require('../validators/workflow.schema');
const controller = require('../controllers/workflow.controller');
const { ROLES } = require('../constants');

const router = Router();

router.use(requireAuth, requireRole(ROLES.RECRUITER));

router.post('/start', validate(startWorkflowSchema), asyncHandler(controller.start));
router.post('/retry', validate(retryWorkflowSchema), asyncHandler(controller.retry));
router.post('/approve', validate(approveWorkflowSchema), asyncHandler(controller.approve));
router.get('/', validate(listWorkflowsQuerySchema, 'query'), asyncHandler(controller.list));
router.get('/:id', asyncHandler(controller.getOne));

module.exports = router;
