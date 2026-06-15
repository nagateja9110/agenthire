const { z } = require('zod');

const answerSchema = z.object({
  answer: z.string().max(8000).default(''),
  mode: z.enum(['voice', 'text']).optional(),
});

const codeSchema = z.object({
  code: z.string().max(20000).default(''),
  language: z.string().max(30).default('javascript'),
});

module.exports = { answerSchema, codeSchema };
