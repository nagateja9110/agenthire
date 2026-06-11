const { specs } = require('../utils/specLoader');
const { invokeLLM, parseJSONResponse, renderTemplate } = require('./llm');

function deterministicInterview({ hiringSpec, job, matchedSkills, spec }) {
  const skills = matchedSkills.length ? matchedSkills : job.required_skills || [];
  const questions = skills.slice(0, spec.question_count).map((skill) => ({
    topic: skill,
    question: `Walk me through a real project where you used ${skill}. What problem did it solve, what trade-offs did you make, and what would you do differently today?`,
  }));
  while (questions.length < spec.question_count) {
    questions.push({
      topic: 'Problem solving',
      question: 'Describe the hardest technical bug you have debugged. How did you isolate the root cause?',
    });
  }

  const primary = skills[0] || 'JavaScript';
  const codingTasks = [
    {
      title: `${primary} feature build`,
      task: `Build a small ${hiringSpec.role || job.title} feature using ${primary}: fetch a paginated list from a REST API, render it with loading and error states, and add client-side filtering. Time box: 45 minutes.`,
    },
  ].slice(0, spec.coding_task_count);

  const rubric = (job.required_skills || []).map((skill) => ({
    criterion: skill,
    description: `Demonstrates working depth in ${skill}: explains concepts accurately and applies them in the coding task. Levels: ${spec.rubric_levels.join(' / ')}.`,
  }));
  rubric.push({
    criterion: 'Communication',
    description: `Explains reasoning clearly and decomposes problems methodically. Levels: ${spec.rubric_levels.join(' / ')}.`,
  });

  return { questions, coding_tasks: codingTasks, rubric, generator: 'deterministic' };
}

async function runInterviewAgent({ hiringSpec, job, matchedSkills, experience }) {
  const spec = specs.interviewAgentPrompt();

  const llmResponse = await invokeLLM({
    system: spec.system_prompt,
    user: renderTemplate(spec.user_prompt_template, {
      role: hiringSpec.role || job.title,
      required_skills: (job.required_skills || []).join(', '),
      preferred_skills: (job.preferred_skills || []).join(', '),
      matched_skills: matchedSkills.join(', ') || 'none',
      experience: experience ?? 'unknown',
      interview_rounds: hiringSpec.interview_rounds || 1,
      question_count: spec.question_count,
      coding_task_count: spec.coding_task_count,
    }),
    temperature: spec.temperature,
  });

  if (!llmResponse) return deterministicInterview({ hiringSpec, job, matchedSkills, spec });

  try {
    const parsed = parseJSONResponse(llmResponse.content);
    if (!Array.isArray(parsed.questions) || !parsed.questions.length) throw new Error('no questions');
    return {
      questions: parsed.questions,
      coding_tasks: parsed.coding_tasks || [],
      rubric: parsed.rubric || [],
      generator: llmResponse.provider,
    };
  } catch (err) {
    return deterministicInterview({ hiringSpec, job, matchedSkills, spec });
  }
}

module.exports = { runInterviewAgent };
