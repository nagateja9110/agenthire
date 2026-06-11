const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiters');
const { signupSchema, loginSchema } = require('../validators/auth.schema');
const controller = require('../controllers/auth.controller');

const router = Router();

router.post('/signup', authLimiter, validate(signupSchema), asyncHandler(controller.signup));
router.post('/login', authLimiter, validate(loginSchema), asyncHandler(controller.login));
router.get('/me', requireAuth, asyncHandler(controller.me));

module.exports = router;
