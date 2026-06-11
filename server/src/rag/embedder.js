const crypto = require('crypto');
const env = require('../config/env');
const { specs } = require('../utils/specLoader');
const { info } = require('../utils/logger');

let pipelinePromise = null;
// Tests always use the deterministic fallback - no model download, stable vectors.
let modelUnavailable = env.NODE_ENV === 'test';

async function loadPipeline() {
  const ragSpec = specs.ragRetrieval();
  // @xenova/transformers is ESM-only; dynamic import from CommonJS.
  const { pipeline } = await import('@xenova/transformers');
  return pipeline('feature-extraction', ragSpec.embedding_model, { quantized: true });
}

/**
 * Deterministic fallback embedding used when the local model cannot load
 * (e.g. offline first run). Token-hash bag-of-words projected into the
 * spec-defined dimension count - stable for identical inputs.
 */
function fallbackEmbedding(text, dimensions) {
  const vector = new Array(dimensions).fill(0);
  const tokens = String(text || '').toLowerCase().match(/[a-z0-9+#]+/g) || [];
  for (const token of tokens) {
    const hash = crypto.createHash('md5').update(token).digest();
    const index = hash.readUInt32BE(0) % dimensions;
    const sign = hash[4] % 2 === 0 ? 1 : -1;
    vector[index] += sign;
  }
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vector.map((v) => v / norm);
}

async function embedTexts(texts) {
  const ragSpec = specs.ragRetrieval();
  if (!modelUnavailable) {
    try {
      if (!pipelinePromise) pipelinePromise = loadPipeline();
      const extractor = await pipelinePromise;
      const vectors = [];
      for (const text of texts) {
        const output = await extractor(text, { pooling: 'mean', normalize: true });
        vectors.push(Array.from(output.data));
      }
      return { vectors, model: ragSpec.embedding_model, fallback: false };
    } catch (err) {
      modelUnavailable = true;
      pipelinePromise = null;
      info(`Embedding model unavailable (${err.message}); using deterministic fallback embeddings`);
    }
  }
  return {
    vectors: texts.map((t) => fallbackEmbedding(t, ragSpec.embedding_dimensions)),
    model: 'deterministic-fallback',
    fallback: true,
  };
}

async function embedText(text) {
  const { vectors, model, fallback } = await embedTexts([text]);
  return { vector: vectors[0], model, fallback };
}

module.exports = { embedTexts, embedText, fallbackEmbedding };
