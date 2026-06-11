const { z } = require('zod');
const { objectId } = require('./candidate.schema');

const startWorkflowSchema = z.object({
  candidate_id: objectId,
});

const retryWorkflowSchema = z.object({
  workflow_id: objectId,
});

const approveWorkflowSchema = z.object({
  workflow_id: objectId,
  decision: z.enum(['approved', 'rejected']),
});

const listWorkflowsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z
    .enum(['pending', 'running', 'waiting_approval', 'completed', 'failed'])
    .optional(),
});

module.exports = {
  startWorkflowSchema,
  retryWorkflowSchema,
  approveWorkflowSchema,
  listWorkflowsQuerySchema,
};
