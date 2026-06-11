/**
 * Builds a minimal but valid single-page PDF containing the given text lines.
 * Used to simulate candidate resume uploads in tests and local demos.
 */
function makeResumePdf(lines) {
  const content = ['BT /F1 12 Tf 50 742 Td'];
  lines.forEach((line, i) => {
    if (i > 0) content.push('0 -16 Td');
    content.push(`(${String(line).replace(/[()\\]/g, ' ')}) Tj`);
  });
  content.push('ET');
  const stream = content.join('\n');

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((obj, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, 'latin1');
}

const SAMPLE_RESUME_LINES = [
  'John Doe',
  'Email: john.doe@example.com | Phone: +91 9876543210',
  'Frontend developer with 3 years of professional experience',
  'building products with React, JavaScript, CSS, Next.js and Tailwind CSS.',
  '',
  'Skills: React, JavaScript, CSS, HTML, Next.js, Tailwind CSS, Node.js, Git',
  '',
  'Education: B.Tech in Computer Science',
  '',
  'Projects:',
  'AgentHire Dashboard - built a recruiter analytics dashboard in React',
  'E-commerce Store - Next.js storefront with Tailwind CSS and Stripe',
];

module.exports = { makeResumePdf, SAMPLE_RESUME_LINES };
