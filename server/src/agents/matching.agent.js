const { specs } = require('../utils/specLoader');
const { computeMatchScore } = require('../utils/scoring');
const { retrievePolicyContext } = require('../rag/retriever');
const { invokeLLM, parseJSONResponse, renderTemplate } = require('./llm');

/**
 * Scoring is fully deterministic (weights from the matching-agent spec).
 * The LLM only writes the human-readable recommendation, grounded in
 * retrieved policy context - it can never change the score.
 */
async function runMatchingAgent({ parsedResume, job, hiringSpec }) {
  const spec = specs.matchingAgentPrompt();

  const result = computeMatchScore({
    candidateSkills: parsedResume.skills || [],
    experience: parsedResume.experience || 0,
    job: {
      required_skills: job.required_skills,
      preferred_skills: job.preferred_skills,
      min_experience: job.min_experience,
    },
    weights: spec.weights,
  });

  const ragContext = await retrievePolicyContext(
    `Evaluation policy for ${hiringSpec.role || job.title} candidates: skills ${(job.required_skills || []).join(', ')}`
  );

  let recommendation = result.all_skills_matched
    ? 'All required skills matched; strong fit for the role.'
    : `Missing required skills: ${result.missing_skills.join(', ') || 'none'}.`;

  const llmResponse = await invokeLLM({
    system: spec.system_prompt,
    user: renderTemplate(spec.user_prompt_template, {
      role: hiringSpec.role || job.title,
      score_breakdown: JSON.stringify(result.breakdown),
      matched_required: result.matched_required.join(', ') || 'none',
      matched_preferred: result.matched_preferred.join(', ') || 'none',
      missing_skills: result.missing_skills.join(', ') || 'none',
      rag_context: ragContext.map((c) => `[${c.source}] ${c.text}`).join('\n') || 'none',
    }),
    temperature: spec.temperature,
  });

  if (llmResponse) {
    try {
      const parsed = parseJSONResponse(llmResponse.content);
      if (parsed.recommendation) recommendation = parsed.recommendation;
    } catch (err) {
      // Keep the deterministic recommendation; a bad LLM sentence must not fail matching.
    }
  }

  return {
    ...result,
    recommendation,
    rag_context_used: ragContext.length,
    weights: spec.weights,
  };
}

module.exports = { runMatchingAgent };
