const rateLimit = require('express-rate-limit');
const env = require('../config/env');

const isTest = env.NODE_ENV === 'test';

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isTest ? 10000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isTest ? 10000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: 'Too many auth attempts, try again later' } },
});

// Per spec: 5 submissions per hour per IP - each upload triggers LLM/embedding/email work.
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: isTest ? 10000 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: 'Application limit reached for this hour. Please try again later.' },
  },
});

module.exports = { globalLimiter, authLimiter, uploadLimiter };
