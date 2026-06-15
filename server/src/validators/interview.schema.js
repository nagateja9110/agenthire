const { z } = require('zod');

const answerSchema = z.object({
  answer: z.string().max(8000).default(''),
  mode: z.enum(['voice', 'text']).optional(),
});

module.exports = { answerSchema };
