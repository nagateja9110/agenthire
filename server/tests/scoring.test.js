const { computeMatchScore, decideShortlist } = require('../src/utils/scoring');
const { chunkText } = require('../src/rag/chunker');
const { specs } = require('../src/utils/specLoader');

describe('computeMatchScore', () => {
  const weights = specs.matchingAgentPrompt().weights;
  const job = {
    required_skills: ['React', 'JavaScript', 'CSS'],
    preferred_skills: ['Next.js', 'Tailwind CSS'],
    min_experience: 2,
  };

  test('full match scores 100', () => {
    const result = computeMatchScore({
      candidateSkills: ['React', 'JavaScript', 'CSS', 'Next.js', 'Tailwind CSS'],
      experience: 3,
      job,
      weights,
    });
    expect(result.match_score).toBe(100);
    expect(result.all_skills_matched).toBe(true);
    expect(result.missing_skills).toEqual([]);
  });

  test('skill aliases match (ReactJS -> React, tailwindcss -> Tailwind CSS)', () => {
    const result = computeMatchScore({
      candidateSkills: ['ReactJS', 'javascript', 'css', 'NextJS', 'tailwindcss'],
      experience: 2,
      job,
      weights,
    });
    expect(result.all_skills_matched).toBe(true);
  });

  test('missing required skills reduce score and are reported', () => {
    const result = computeMatchScore({
      candidateSkills: ['React', 'CSS'],
      experience: 3,
      job,
      weights,
    });
    expect(result.missing_skills).toEqual(['JavaScript']);
    expect(result.all_skills_matched).toBe(false);
    expect(result.match_score).toBeLessThan(100);
  });

  test('experience below minimum is proportional, not disqualifying', () => {
    const full = computeMatchScore({ candidateSkills: ['React', 'JavaScript', 'CSS'], experience: 2, job, weights });
    const half = computeMatchScore({ candidateSkills: ['React', 'JavaScript', 'CSS'], experience: 1, job, weights });
    expect(half.match_score).toBeLessThan(full.match_score);
    expect(half.breakdown.experience).toBeCloseTo(full.breakdown.experience / 2, 1);
  });
});

describe('decideShortlist (thresholds from spec, never hardcoded)', () => {
  const rules = specs.shortlistingRules();

  test('bands follow shortlisting-rules.json', () => {
    expect(decideShortlist(rules.shortlist_min, rules)).toBe('shortlisted');
    expect(decideShortlist(rules.shortlist_min - 1, rules)).toBe('hold');
    expect(decideShortlist(rules.hold_min, rules)).toBe('hold');
    expect(decideShortlist(rules.hold_min - 1, rules)).toBe('rejected');
  });

  test('hiring spec minimum_score overrides shortlist_min', () => {
    const override = 75;
    expect(decideShortlist(76, rules, override)).toBe('shortlisted');
    expect(decideShortlist(74, rules, override)).toBe('hold');
  });
});

describe('chunkText (sizes from rag-retrieval spec)', () => {
  const ragSpec = specs.ragRetrieval();

  test('respects resume chunk size', () => {
    const text = 'a'.repeat(ragSpec.resume_chunk_chars * 3);
    const chunks = chunkText(text, ragSpec.resume_chunk_chars, ragSpec.chunk_overlap_chars);
    expect(chunks.length).toBeGreaterThan(2);
    for (const chunk of chunks) expect(chunk.length).toBeLessThanOrEqual(ragSpec.resume_chunk_chars);
  });

  test('short text yields one chunk; empty yields none', () => {
    expect(chunkText('hello world', 500)).toEqual(['hello world']);
    expect(chunkText('', 500)).toEqual([]);
  });
});
