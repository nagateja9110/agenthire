const { z } = require('zod');

const skillList = z
  .array(z.string().min(1).max(50))
  .min(1, 'At least one skill is required')
  .max(30);

const createJobSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(5000),
  required_skills: skillList,
  preferred_skills: z.array(z.string().min(1).max(50)).max(30).default([]),
  min_experience: z.number().min(0).max(50).default(0),
  workflow_spec_id: z.string().default('default-hiring-workflow'),
  hiring_spec_id: z.string().default('frontend-developer'),
});

const updateJobSchema = createJobSchema.partial();

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

module.exports = { createJobSchema, updateJobSchema, listQuerySchema };
