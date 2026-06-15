const { z } = require('zod');

const answerSchema = z.object({
  answer: z.string().max(8000).default(''),
  mode: z.enum(['voice', 'text']).optional(),
});

const codeSchema = z.object({
  code: z.string().max(20000).default(''),
  language: z.enum(['python', 'cpp', 'java']).default('python'),
});

module.exports = { answerSchema, codeSchema };
