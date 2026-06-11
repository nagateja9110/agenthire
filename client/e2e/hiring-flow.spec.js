const { test, expect } = require('@playwright/test');
const path = require('path');
const { makeResumePdf, SAMPLE_RESUME_LINES } = require(path.join(
  __dirname,
  '../../server/tests/helpers/pdf'
));

/**
 * Full happy path: recruiter signs up, creates a job, a candidate applies
 * with a PDF on the public page, the workflow pauses for approval, the
 * recruiter approves, and the run completes.
 * Requires MongoDB (and optionally Qdrant) running locally.
 */
test('recruiter creates job, candidate applies, workflow completes after approval', async ({
  page,
}) => {
  const stamp = Date.now();

  // --- Recruiter signup ---
  await page.goto('/signup');
  await page.fill('#name', 'E2E Recruiter');
  await page.fill('#email', `e2e-${stamp}@test.com`);
  await page.fill('#password', 'password123');
  await page.click('button[type=submit]');
  await expect(page).toHaveURL(/\/dashboard/);

  // --- Create job ---
  await page.goto('/dashboard/jobs/create');
  await page.fill('#title', `Frontend Developer E2E ${stamp}`);
  await page.fill('#description', 'End-to-end test role: build React UIs with Next.js.');
  await page.fill('#required_skills', 'React, JavaScript, CSS');
  await page.fill('#preferred_skills', 'Next.js, Tailwind CSS');
  await page.fill('#min_experience', '1');
  await page.click('button[type=submit]');
  await expect(page).toHaveURL(/\/dashboard\/jobs$/);
  await expect(page.getByText(`Frontend Developer E2E ${stamp}`)).toBeVisible();

  // --- Get the public apply link from the job card ---
  await page
    .locator('div', { hasText: `Frontend Developer E2E ${stamp}` })
    .last()
    .getByRole('button', { name: /copy public apply link/i })
    .click();
  const applyUrl = await page.evaluate(() => navigator.clipboard.readText());
  expect(applyUrl).toContain('/apply');

  // --- Candidate applies on the public page (no auth) ---
  const context = page.context();
  const candidatePage = await context.newPage();
  await candidatePage.goto(applyUrl);
  await candidatePage.fill('#name', 'John Doe');
  await candidatePage.fill('#email', `john-${stamp}@example.com`);
  await candidatePage.fill('#phone', '+91 98765 43210');
  await candidatePage.setInputFiles('input[type=file]', {
    name: 'john-react-resume.pdf',
    mimeType: 'application/pdf',
    buffer: makeResumePdf(SAMPLE_RESUME_LINES),
  });
  await candidatePage.getByRole('button', { name: /submit application/i }).click();
  await expect(candidatePage.getByText('Application submitted!')).toBeVisible({ timeout: 30000 });
  await candidatePage.close();

  // --- Workflow pauses at human approval ---
  await page.goto('/dashboard/workflows');
  await expect(page.getByRole('button', { name: /^approve$/i })).toBeVisible({ timeout: 45000 });

  // --- Approve and watch it complete ---
  await page.getByRole('button', { name: /^approve$/i }).click();
  await expect(page.getByText('completed').first()).toBeVisible({ timeout: 45000 });
});
