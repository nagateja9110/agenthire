const { specs } = require('../utils/specLoader');
const { renderTemplate } = require('./llm');
const { sendEmail, getLogoDataUri } = require('../emails/resendClient');

/**
 * Renders the spec-defined email template and delivers through Resend.
 * Without RESEND_API_KEY the agent produces the rendered output as a
 * fallback instead of failing the workflow.
 */
async function runEmailAgent({ outcome, candidate, hiringSpec, job, matchScore, interviewLink }) {
  const templateId = outcome === 'approved' ? 'interview-invite' : 'rejection';
  const template = specs.emailTemplate(templateId);

  const vars = {
    candidate_name: candidate.name,
    role: hiringSpec.role || job.title,
    match_score: matchScore ?? 'n/a',
    interview_rounds: hiringSpec.interview_rounds || 1,
    interview_link: interviewLink || '',
  };

  const subject = renderTemplate(template.subject_template, vars);
  const body = renderTemplate(template.body_template, vars);
  const logo = getLogoDataUri();
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827; background: #f8fafc; padding: 24px;">
      <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden;">
        <div style="padding: 24px; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; gap: 12px;">
          <img src="${logo}" alt="AgentHire" width="44" height="44" style="display:block; border-radius: 12px;" />
          <div>
            <div style="font-size: 18px; font-weight: 700; color: #0f172a;">AgentHire</div>
            <div style="font-size: 13px; color: #64748b;">Recruiting workflow updates</div>
          </div>
        </div>
        <div style="padding: 28px 24px;">
          ${body
            .split('\n\n')
            .map((paragraph) => `<p style="margin: 0 0 16px;">${paragraph.replace(/\n/g, '<br />')}</p>`)
            .join('')}
        </div>
      </div>
    </div>
  `;

  // Delivery is best-effort: a bounced/rejected email must never fail the
  // hiring workflow. On error we degrade to fallback output (the rendered
  // email is still recorded and the interview link still exists).
  let delivery;
  try {
    delivery = await sendEmail({
      from: template.from,
      to: candidate.email,
      subject,
      text: body,
      html,
    });
  } catch (err) {
    delivery = { delivered: false, fallback: true, reason: err.message };
  }

  return {
    template_id: templateId,
    to: candidate.email,
    subject,
    body,
    interview_link: interviewLink || null,
    ...delivery,
    // Templates are rendered locally either way; engine reflects delivery.
    engine: delivery.delivered ? 'resend' : 'fallback',
  };
}

module.exports = { runEmailAgent };
