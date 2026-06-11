const { Router } = require('express');
const authRoutes = require('./auth.routes');
const jobRoutes = require('./job.routes');
const candidateRoutes = require('./candidate.routes');
const workflowRoutes = require('./workflow.routes');
const analyticsRoutes = require('./analytics.routes');

const router = Router();

router.get('/health', (req, res) => res.json({ success: true, data: { status: 'ok' } }));
router.use('/auth', authRoutes);
router.use('/jobs', jobRoutes);
router.use('/candidates', candidateRoutes);
router.use('/workflow', workflowRoutes);
router.use('/workflows', workflowRoutes);
router.use('/analytics', analyticsRoutes);

module.exports = router;
