const env = require('../config/env');
const { RetryableError, NonRetryableError } = require('../utils/errors');
const { info } = require('../utils/logger');

const LLM_TIMEOUT_MS = 30000;

function hasLLM() {
  return Boolean(env.GROQ_API_KEY || env.OPENROUTER_API_KEY);
}

async function buildGroq(temperature) {
  const { ChatGroq } = require('@langchain/groq');
  return new ChatGroq({
    apiKey: env.GROQ_API_KEY,
    model: env.GROQ_MODEL,
    temperature,
    maxRetries: 0,
    timeout: LLM_TIMEOUT_MS,
  });
}

async function buildOpenRouter(temperature) {
  const { ChatOpenAI } = require('@langchain/openai');
  return new ChatOpenAI({
    apiKey: env.OPENROUTER_API_KEY,
    model: env.OPENROUTER_MODEL,
    temperature,
    maxRetries: 0,
    timeout: LLM_TIMEOUT_MS,
    configuration: { baseURL: 'https://openrouter.ai/api/v1' },
  });
}

/**
 * Invokes the primary LLM (Groq) and falls back to OpenRouter free models.
 * Returns null when no provider is configured, so agents can use their
 * deterministic fallbacks instead of failing the workflow.
 */
async function invokeLLM({ system, user, temperature = 0 }) {
  if (!hasLLM()) return null;

  const messages = [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];

  const providers = [];
  if (env.GROQ_API_KEY) providers.push({ name: 'groq', build: buildGroq });
  if (env.OPENROUTER_API_KEY) providers.push({ name: 'openrouter', build: buildOpenRouter });

  let lastError = null;
  for (const provider of providers) {
    try {
      const model = await provider.build(temperature);
      const response = await model.invoke(messages);
      const content =
        typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content);
      return { content, provider: provider.name };
    } catch (err) {
      lastError = err;
      info(`LLM provider ${provider.name} failed: ${err.message}`);
    }
  }
  throw new RetryableError('LLM_TIMEOUT', `All LLM providers failed: ${lastError.message}`, lastError);
}

/**
 * Extracts a JSON object from an LLM response, tolerating markdown fences.
 * Malformed JSON is non-retryable per the retry-policy spec.
 */
function parseJSONResponse(content) {
  let text = String(content || '').trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) text = fenced[1].trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) text = text.slice(start, end + 1);
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new NonRetryableError('MALFORMED_JSON', `LLM returned malformed JSON: ${err.message}`);
  }
}

function renderTemplate(template, vars) {
  return String(template || '').replace(/\{\{(\w+)\}\}/g, (match, key) =>
    vars[key] !== undefined && vars[key] !== null ? String(vars[key]) : match
  );
}

module.exports = { invokeLLM, parseJSONResponse, renderTemplate, hasLLM };
