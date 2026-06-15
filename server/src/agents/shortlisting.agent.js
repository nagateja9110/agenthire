const { decideShortlist } = require('../utils/scoring');

/**
 * Pure rules engine. Thresholds come from the workflow's spec snapshot
 * (taken from /specs/evaluation/shortlisting-rules.json at start),
 * with the job hiring spec's minimum_score overriding shortlist_min.
 */
function runShortlistingAgent({ matchScore, shortlistingRules, hiringSpec }) {
  const decision = decideShortlist(matchScore, shortlistingRules, hiringSpec.minimum_score);
  const effectiveShortlistMin =
    typeof hiringSpec.minimum_score === 'number'
      ? hiringSpec.minimum_score
      : shortlistingRules.shortlist_min;

  return {
    decision,
    match_score: matchScore,
    // Shortlisting is a pure rules engine by design - never an LLM.
    engine: 'rules',
    thresholds: {
      shortlist_min: effectiveShortlistMin,
      hold_min: shortlistingRules.hold_min,
      source:
        typeof hiringSpec.minimum_score === 'number'
          ? `hiring spec minimum_score (${hiringSpec.id || hiringSpec.role}) overriding shortlisting-rules`
          : 'specs/evaluation/shortlisting-rules.json',
    },
  };
}

module.exports = { runShortlistingAgent };
