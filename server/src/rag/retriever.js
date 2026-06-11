const fs = require('fs');
const path = require('path');
const { specs } = require('../utils/specLoader');
const { chunkText } = require('./chunker');
const { embedTexts, embedText } = require('./embedder');
const { upsertPoints, search, pointId } = require('./vectorStore');

const DOCS_DIR = path.join(__dirname, '../../../docs');
let policiesSeeded = false;

/**
 * Seeds organizational knowledge (hiring policies, evaluation rules,
 * interview guidelines) into the policies collection. Sources: /docs
 * markdown files plus the JSON specs themselves rendered as text.
 */
async function seedPolicies() {
  if (policiesSeeded) return;
  const ragSpec = specs.ragRetrieval();

  const documents = [];
  if (fs.existsSync(DOCS_DIR)) {
    for (const file of fs.readdirSync(DOCS_DIR).filter((f) => f.endsWith('.md'))) {
      documents.push({
        source: `docs/${file}`,
        text: fs.readFileSync(path.join(DOCS_DIR, file), 'utf8'),
      });
    }
  }
  const shortlisting = specs.shortlistingRules();
  documents.push({
    source: 'specs/evaluation/shortlisting-rules.json',
    text: `Shortlisting policy: candidates scoring at least ${shortlisting.shortlist_min} are shortlisted; scores from ${shortlisting.hold_min} to ${shortlisting.shortlist_min - 1} are placed on hold for recruiter review; scores below ${shortlisting.hold_min} are rejected. ${shortlisting.precedence_note}`,
  });

  const points = [];
  for (const doc of documents) {
    const chunks = chunkText(doc.text, ragSpec.policy_chunk_chars, ragSpec.chunk_overlap_chars);
    if (!chunks.length) continue;
    const { vectors } = await embedTexts(chunks);
    chunks.forEach((chunk, i) => {
      points.push({
        id: pointId(`${doc.source}:${i}`),
        vector: vectors[i],
        payload: { text: chunk, source: doc.source, type: 'policy', chunk_index: i },
      });
    });
  }
  if (points.length) await upsertPoints(ragSpec.collections.policies, points);
  policiesSeeded = true;
}

async function indexResume({ candidateId, resumeText }) {
  const ragSpec = specs.ragRetrieval();
  const chunks = chunkText(resumeText, ragSpec.resume_chunk_chars, ragSpec.chunk_overlap_chars);
  if (!chunks.length) return { chunks: 0 };

  const { vectors, model, fallback } = await embedTexts(chunks);
  const points = chunks.map((chunk, i) => ({
    id: pointId(`resume:${candidateId}:${i}`),
    vector: vectors[i],
    payload: { text: chunk, candidate_id: String(candidateId), type: 'resume', chunk_index: i },
  }));
  const result = await upsertPoints(ragSpec.collections.resumes, points);
  return { chunks: chunks.length, model, fallback_embeddings: fallback, backend: result.backend };
}

async function retrievePolicyContext(query) {
  const ragSpec = specs.ragRetrieval();
  await seedPolicies();
  const { vector } = await embedText(query);
  const results = await search(ragSpec.collections.policies, vector, {
    topK: ragSpec.top_k,
    minSimilarity: ragSpec.minimum_similarity,
  });
  return results.map((r) => ({ text: r.payload.text, source: r.payload.source, score: r.score }));
}

module.exports = { indexResume, retrievePolicyContext, seedPolicies };
