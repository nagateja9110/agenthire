const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/agenthire',
  JWT_SECRET: process.env.JWT_SECRET || '',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  GROQ_API_KEY: process.env.GROQ_API_KEY || '',
  GROQ_MODEL: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',
  OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free',
  QDRANT_URL: process.env.QDRANT_URL || 'http://localhost:6333',
  QDRANT_API_KEY: process.env.QDRANT_API_KEY || '',
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  MURF_API_KEY: process.env.MURF_API_KEY || '',
  MURF_VOICE_ID: process.env.MURF_VOICE_ID || 'Anisha',
  ASSEMBLYAI_API_KEY: process.env.ASSEMBLYAI_API_KEY || '',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
};

function assertEnv() {
  if (!env.JWT_SECRET) {
    if (env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET is required in production');
    }
    env.JWT_SECRET = 'dev-only-insecure-secret';
  }
}

assertEnv();

module.exports = env;
