process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.GROQ_API_KEY = '';
process.env.OPENROUTER_API_KEY = '';
process.env.RESEND_API_KEY = '';

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri('agenthire_test');
  const { connectDB } = require('../src/config/db');
  await connectDB(process.env.MONGODB_URI);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

// Polls until fn() is truthy or the timeout elapses.
global.waitFor = async function waitFor(fn, { timeout = 30000, interval = 200 } = {}) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const result = await fn();
    if (result) return result;
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error('waitFor timed out');
};
