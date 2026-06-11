function normalizeSkill(skill) {
  let s = String(skill || '')
    .toLowerCase()
    .replace(/[^a-z0-9+#]/g, '');
  // "react" / "reactjs" / "react.js" are the same skill.
  if (s.length > 2 && s.endsWith('js')) s = s.slice(0, -2);
  return s;
}

function skillMatches(candidateSkills, target) {
  const normalizedTarget = normalizeSkill(target);
  return candidateSkills.some((s) => normalizeSkill(s) === normalizedTarget);
}

/**
 * Deterministic match scoring. Weights come from the matching-agent spec,
 * never from constants in this file.
 */
function computeMatchScore({ candidateSkills = [], experience = 0, job, weights }) {
  const required = job.required_skills || [];
  const preferred = job.preferred_skills || [];
  const minExperience = job.min_experience || 0;

  const matchedRequired = required.filter((s) => skillMatches(candidateSkills, s));
  const matchedPreferred = preferred.filter((s) => skillMatches(candidateSkills, s));
  const missingSkills = required.filter((s) => !skillMatches(candidateSkills, s));

  const requiredScore = required.length
    ? (matchedRequired.length / required.length) * weights.required_skills
    : weights.required_skills;
  const preferredScore = preferred.length
    ? (matchedPreferred.length / preferred.length) * weights.preferred_skills
    : weights.preferred_skills;
  const experienceRatio = minExperience > 0 ? Math.min((experience || 0) / minExperience, 1) : 1;
  const experienceScore = experienceRatio * weights.experience;

  const matchScore = Math.round(requiredScore + preferredScore + experienceScore);

  return {
    match_score: matchScore,
    matched_required: matchedRequired,
    matched_preferred: matchedPreferred,
    missing_skills: missingSkills,
    all_skills_matched: missingSkills.length === 0,
    breakdown: {
      required: Math.round(requiredScore * 100) / 100,
      preferred: Math.round(preferredScore * 100) / 100,
      experience: Math.round(experienceScore * 100) / 100,
    },
  };
}

/**
 * Shortlisting decision. Thresholds come from shortlisting-rules spec;
 * a job hiring spec minimum_score, when present, overrides shortlist_min.
 */
function decideShortlist(score, rules, hiringSpecMinimumScore) {
  const shortlistMin =
    typeof hiringSpecMinimumScore === 'number' ? hiringSpecMinimumScore : rules.shortlist_min;
  if (score >= shortlistMin) return 'shortlisted';
  if (score >= rules.hold_min) return 'hold';
  return 'rejected';
}

module.exports = { computeMatchScore, decideShortlist, normalizeSkill, skillMatches };
