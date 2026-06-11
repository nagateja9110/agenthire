const env = require('../config/env');
const { RetryableError } = require('../utils/errors');

let resend = null;

function isConfigured() {
  return Boolean(env.RESEND_API_KEY);
}

async function sendEmail({ from, to, subject, text }) {
  if (!isConfigured()) {
    return { delivered: false, fallback: true, reason: 'RESEND_API_KEY not set' };
  }
  if (!resend) {
    const { Resend } = require('resend');
    resend = new Resend(env.RESEND_API_KEY);
  }
  const { data, error } = await resend.emails.send({ from, to, subject, text });
  if (error) {
    throw new RetryableError('EMAIL_API_FAILURE', `Resend error: ${error.message || error.name}`);
  }
  return { delivered: true, fallback: false, id: data && data.id };
}

module.exports = { sendEmail, isConfigured };
