const { z } = require('zod');

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

const uploadCandidateSchema = z.object({
  job_id: objectId,
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().min(7).max(20),
});

const listCandidatesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  job_id: objectId.optional(),
  status: z.enum(['applied', 'processing', 'shortlisted', 'hold', 'rejected', 'invited']).optional(),
});

module.exports = { uploadCandidateSchema, listCandidatesQuerySchema, objectId };
