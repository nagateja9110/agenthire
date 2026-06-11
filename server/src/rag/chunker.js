/**
 * Splits text into fixed-size character chunks with overlap.
 * Chunk sizes come from /specs/evaluation/rag-retrieval.json - never hardcoded here.
 */
function chunkText(text, chunkSize, overlap = 0) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  if (clean.length <= chunkSize) return [clean];

  const chunks = [];
  const step = Math.max(chunkSize - overlap, 1);
  for (let start = 0; start < clean.length; start += step) {
    const chunk = clean.slice(start, start + chunkSize);
    if (chunk.trim()) chunks.push(chunk.trim());
    if (start + chunkSize >= clean.length) break;
  }
  return chunks;
}

module.exports = { chunkText };
