const { specs } = require('../utils/specLoader');
const { renderTemplate } = require('./llm');
const { sendEmail } = require('../emails/resendClient');

/**
 * Renders the spec-defined email template and delivers through Resend.
 * Without RESEND_API_KEY the agent produces the rendered output as a
 * fallback instead of failing the workflow.
 */
async function runEmailAgent({ outcome, candidate, hiringSpec, job, matchScore }) {
  const templateId = outcome === 'approved' ? 'interview-invite' : 'rejection';
  const template = specs.emailTemplate(templateId);

  const vars = {
    candidate_name: candidate.name,
    role: hiringSpec.role || job.title,
    match_score: matchScore ?? 'n/a',
    interview_rounds: hiringSpec.interview_rounds || 1,
  };

  const subject = renderTemplate(template.subject_template, vars);
  const body = renderTemplate(template.body_template, vars);

  const delivery = await sendEmail({
    from: template.from,
    to: candidate.email,
    subject,
    text: body,
  });

  return {
    template_id: templateId,
    to: candidate.email,
    subject,
    body,
    ...delivery,
  };
}

module.exports = { runEmailAgent };
