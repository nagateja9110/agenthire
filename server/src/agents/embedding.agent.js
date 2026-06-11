const { indexResume, seedPolicies } = require('../rag/retriever');

async function runEmbeddingAgent({ candidateId, resumeText }) {
  await seedPolicies();
  const result = await indexResume({ candidateId, resumeText });
  return result;
}

module.exports = { runEmbeddingAgent };
