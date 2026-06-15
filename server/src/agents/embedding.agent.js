const { indexResume, seedPolicies } = require('../rag/retriever');

async function runEmbeddingAgent({ candidateId, resumeText }) {
  await seedPolicies();
  const result = await indexResume({ candidateId, resumeText });
  // bge-small runs locally either way; "fallback" means even the local model
  // was unavailable and deterministic hash vectors were used instead.
  return { ...result, engine: result.fallback_embeddings ? 'fallback' : 'local-model' };
}

module.exports = { runEmbeddingAgent };
