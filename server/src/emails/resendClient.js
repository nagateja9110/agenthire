const fs = require('fs');
const path = require('path');
const env = require('../config/env');
const { RetryableError } = require('../utils/errors');

let resend = null;
let logoDataUri = null;

function isConfigured() {
  return Boolean(env.RESEND_API_KEY);
}

async function sendEmail({ from, to, subject, text, html }) {
  if (!isConfigured()) {
    return { delivered: false, fallback: true, reason: 'RESEND_API_KEY not set' };
  }
  if (!resend) {
    const { Resend } = require('resend');
    resend = new Resend(env.RESEND_API_KEY);
  }
  const payload = { from, to, subject, text };
  if (typeof html === 'string' && html.length > 0) {
    payload.html = html;
  }
  const { data, error } = await resend.emails.send(payload);
  if (error) {
    throw new RetryableError('EMAIL_API_FAILURE', `Resend error: ${error.message || error.name}`);
  }
  return { delivered: true, fallback: false, id: data && data.id };
}

function getLogoDataUri() {
  if (!logoDataUri) {
    const logoPath = path.resolve(__dirname, 'assets/logo.png');
    const logoBuffer = fs.readFileSync(logoPath);
    logoDataUri = `data:image/png;base64,${logoBuffer.toString('base64')}`;
  }
  return logoDataUri;
}

module.exports = { sendEmail, isConfigured, getLogoDataUri };
