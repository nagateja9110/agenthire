const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth, requireRole } = require('../middleware/auth');
const controller = require('../controllers/analytics.controller');
const { ROLES } = require('../constants');

const router = Router();

router.get('/', requireAuth, requireRole(ROLES.RECRUITER), asyncHandler(controller.overview));

module.exports = router;
