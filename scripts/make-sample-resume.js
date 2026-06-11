#!/usr/bin/env node
/**
 * Generates sample candidate resume PDFs for local demos:
 *   node scripts/make-sample-resume.js
 * Writes john-react-resume.pdf (strong match) and sam-cobol-resume.pdf
 * (weak match -> rejection branch) into ./scripts.
 */
const fs = require('fs');
const path = require('path');
const { makeResumePdf, SAMPLE_RESUME_LINES } = require('../server/tests/helpers/pdf');

const WEAK_RESUME_LINES = [
  'Sam Cook',
  'Email: sam.cook@example.com | Phone: +91 9123456780',
  'Mainframe developer with 1 year of professional experience.',
  '',
  'Skills: COBOL, Fortran, JCL',
  '',
  'Education: B.Sc Mathematics',
];

const outputs = [
  ['john-react-resume.pdf', SAMPLE_RESUME_LINES],
  ['sam-cobol-resume.pdf', WEAK_RESUME_LINES],
];

for (const [filename, lines] of outputs) {
  const outPath = path.join(__dirname, filename);
  fs.writeFileSync(outPath, makeResumePdf(lines));
  console.log(`Wrote ${outPath}`);
}
