const crypto = require('crypto');
const { QdrantClient } = require('@qdrant/js-client-rest');
const env = require('../config/env');
const { specs } = require('../utils/specLoader');
const { info } = require('../utils/logger');

let qdrant = null;
let qdrantDown = false;
const ensuredCollections = new Set();

// In-memory store used for tests and as a graceful fallback when Qdrant is down.
const memoryStore = new Map(); // collection -> [{ id, vector, payload }]

function getClient() {
  if (!qdrant) {
    qdrant = new QdrantClient({
      url: env.QDRANT_URL,
      apiKey: env.QDRANT_API_KEY || undefined,
      checkCompatibility: false,
    });
  }
  return qdrant;
}

function useMemory() {
  return env.NODE_ENV === 'test' || qdrantDown;
}

function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
}

async function ensureCollection(name) {
  if (useMemory()) {
    if (!memoryStore.has(name)) memoryStore.set(name, []);
    return;
  }
  if (ensuredCollections.has(name)) return;
  const ragSpec = specs.ragRetrieval();
  const client = getClient();
  try {
    const collections = await client.getCollections();
    const exists = collections.collections.some((c) => c.name === name);
    if (!exists) {
      await client.createCollection(name, {
        vectors: { size: ragSpec.embedding_dimensions, distance: 'Cosine' },
      });
    }
    ensuredCollections.add(name);
  } catch (err) {
    qdrantDown = true;
    if (!memoryStore.has(name)) memoryStore.set(name, []);
    info(`Qdrant unavailable (${err.message}); using in-memory vector store`);
  }
}

async function upsertPoints(collection, points) {
  await ensureCollection(collection);
  if (useMemory()) {
    const store = memoryStore.get(collection);
    for (const point of points) {
      const existingIndex = store.findIndex((p) => p.id === point.id);
      if (existingIndex >= 0) store[existingIndex] = point;
      else store.push(point);
    }
    return { stored: points.length, backend: 'memory' };
  }
  try {
    const client = getClient();
    await client.upsert(collection, {
      wait: true,
      points: points.map((p) => ({ id: p.id, vector: p.vector, payload: p.payload })),
    });
    return { stored: points.length, backend: 'qdrant' };
  } catch (err) {
    qdrantDown = true;
    return upsertPoints(collection, points);
  }
}

async function search(collection, vector, { topK, minSimilarity }) {
  await ensureCollection(collection);
  if (useMemory()) {
    const store = memoryStore.get(collection) || [];
    return store
      .map((p) => ({ score: cosineSimilarity(vector, p.vector), payload: p.payload }))
      .filter((r) => r.score >= minSimilarity)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }
  try {
    const client = getClient();
    const results = await client.search(collection, {
      vector,
      limit: topK,
      score_threshold: minSimilarity,
      with_payload: true,
    });
    return results.map((r) => ({ score: r.score, payload: r.payload }));
  } catch (err) {
    qdrantDown = true;
    return search(collection, vector, { topK, minSimilarity });
  }
}

function pointId(seed) {
  // Qdrant requires UUID or unsigned int ids; derive a stable UUID from the seed.
  const hash = crypto.createHash('md5').update(seed).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

function resetMemoryStore() {
  memoryStore.clear();
}

module.exports = { upsertPoints, search, pointId, resetMemoryStore, cosineSimilarity };
