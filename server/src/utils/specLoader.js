const fs = require('fs');
const path = require('path');

const SPECS_ROOT = path.join(__dirname, '../../../specs');
const cache = new Map();

function loadSpec(relativePath) {
  if (cache.has(relativePath)) return cache.get(relativePath);
  const fullPath = path.join(SPECS_ROOT, relativePath);
  const raw = fs.readFileSync(fullPath, 'utf8');
  const parsed = JSON.parse(raw);
  cache.set(relativePath, parsed);
  return parsed;
}

function clearSpecCache() {
  cache.clear();
}

const specs = {
  hiring: (id) => loadSpec(`hiring/${id}.json`),
  workflow: (id = 'default-hiring-workflow') => loadSpec(`workflow/${id}.json`),
  nodeStates: () => loadSpec('workflow/node-states.json'),
  shortlistingRules: () => loadSpec('evaluation/shortlisting-rules.json'),
  ragRetrieval: () => loadSpec('evaluation/rag-retrieval.json'),
  resumeParserPrompt: () => loadSpec('prompts/resume-parser.json'),
  matchingAgentPrompt: () => loadSpec('prompts/matching-agent.json'),
  interviewAgentPrompt: () => loadSpec('prompts/interview-agent.json'),
  interviewEvaluatorPrompt: () => loadSpec('prompts/interview-evaluator.json'),
  interviewConductorPrompt: () => loadSpec('prompts/interview-conductor.json'),
  emailTemplate: (id) => loadSpec(`email/${id}.json`),
  retryPolicy: () => loadSpec('system/retry-policy.json'),
};

module.exports = { loadSpec, clearSpecCache, specs, SPECS_ROOT };
