const { specs } = require('../utils/specLoader');
const { invokeLLM, parseJSONResponse, renderTemplate } = require('./llm');
const { normalizeSkill } = require('../utils/scoring');

/**
 * Deterministic extraction used when no LLM provider is configured.
 * Matches the spec's known skills + the job's skills against the resume text.
 */
function deterministicParse(resumeText, knownSkills, jobSkills, candidate) {
  const text = resumeText.toLowerCase();
  const allSkills = [...new Set([...knownSkills, ...jobSkills])];
  const skills = allSkills.filter((skill) => {
    const variants = [skill.toLowerCase(), normalizeSkill(skill)];
    return variants.some((v) => v && text.includes(v));
  });

  let experience = null;
  const expMatch =
    resumeText.match(/(\d+(?:\.\d+)?)\+?\s*years?\s+(?:of\s+)?(?:professional\s+)?experience/i) ||
    resumeText.match(/experience\s*[:\-]?\s*(\d+(?:\.\d+)?)\+?\s*years?/i);
  if (expMatch) experience = parseFloat(expMatch[1]);

  let education = null;
  const eduMatch = resumeText.match(
    /\b(B\.?\s?Tech|B\.?E\.?|B\.?Sc|M\.?\s?Tech|M\.?Sc|MCA|BCA|Bachelor[^,\n.]*|Master[^,\n.]*|PhD)\b/i
  );
  if (eduMatch) education = eduMatch[0].trim();

  const projects = [];
  const projectSection = resumeText.match(/projects?\s*[:\n]([\s\S]{0,800})/i);
  if (projectSection) {
    const lines = projectSection[1]
      .split('\n')
      .map((l) => l.replace(/^[-*•\s]+/, '').trim())
      .filter((l) => l.length > 10)
      .slice(0, 3);
    for (const line of lines) {
      const [title, ...rest] = line.split(/[:\-–]/);
      projects.push({ title: title.trim().slice(0, 80), description: rest.join('-').trim().slice(0, 200) });
    }
  }

  return {
    name: candidate.name,
    email: candidate.email,
    phone: candidate.phone,
    skills,
    experience,
    education,
    projects,
  };
}

async function runResumeParser({ resumeText, job, candidate }) {
  const spec = specs.resumeParserPrompt();
  const jobSkills = [...(job.required_skills || []), ...(job.preferred_skills || [])];

  const llmResponse = await invokeLLM({
    system: spec.system_prompt,
    user: renderTemplate(spec.user_prompt_template, {
      known_skills: spec.known_skills.join(', '),
      required_skills: (job.required_skills || []).join(', '),
      preferred_skills: (job.preferred_skills || []).join(', '),
      resume_text: resumeText.slice(0, 12000),
    }),
    temperature: spec.temperature,
  });

  if (!llmResponse) {
    return {
      ...deterministicParse(resumeText, spec.known_skills, jobSkills, candidate),
      parser: 'deterministic',
      engine: 'fallback',
    };
  }

  const parsed = parseJSONResponse(llmResponse.content);
  return {
    name: parsed.name || candidate.name,
    email: parsed.email || candidate.email,
    phone: parsed.phone || candidate.phone,
    skills: Array.isArray(parsed.skills) ? parsed.skills : [],
    experience: typeof parsed.experience === 'number' ? parsed.experience : null,
    education: parsed.education || null,
    projects: Array.isArray(parsed.projects) ? parsed.projects : [],
    parser: llmResponse.provider,
    engine: llmResponse.provider,
  };
}

module.exports = { runResumeParser, deterministicParse };
