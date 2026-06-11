const fs = require('fs');
const Candidate = require('../models/Candidate');
const Job = require('../models/Job');
const { ApiError } = require('../utils/errors');
const { CANDIDATE_STATUS } = require('../constants');

async function extractPdfText(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    // pdfjs-dist is ESM-only; dynamic import from CommonJS.
    const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const doc = await getDocument({ data: new Uint8Array(buffer), verbosity: 0 }).promise;
    let text = '';
    for (let pageNum = 1; pageNum <= doc.numPages; pageNum += 1) {
      const page = await doc.getPage(pageNum);
      const content = await page.getTextContent();
      text += content.items.map((item) => item.str).join(' ') + '\n';
    }
    text = text.trim();
    if (!text) throw new Error('Empty PDF text');
    return text;
  } catch (err) {
    throw new ApiError(400, 'Invalid PDF: the resume could not be read');
  }
}

async function createApplication({ job_id, name, email, phone, filePath, resumeUrl }) {
  const job = await Job.findById(job_id);
  if (!job) throw new ApiError(404, 'Job not found');

  const existing = await Candidate.findOne({ job_id, email: email.toLowerCase() });
  if (existing) {
    throw new ApiError(409, 'You have already applied to this job', {
      candidate_id: existing._id,
      workflow_id: existing.workflow_id,
    });
  }

  const resumeText = await extractPdfText(filePath);

  const candidate = await Candidate.create({
    job_id,
    name,
    email,
    phone,
    resume_url: resumeUrl,
    status: CANDIDATE_STATUS.APPLIED,
  });

  return { candidate, job, resumeText };
}

async function listCandidates({ page, limit, job_id, status }, userId) {
  const ownJobIds = await Job.find({ created_by: userId }).distinct('_id');
  const filter = { job_id: job_id ? job_id : { $in: ownJobIds } };
  if (job_id && !ownJobIds.some((id) => id.toString() === job_id)) {
    throw new ApiError(403, 'Not your job');
  }
  if (status) filter.status = status;

  const [items, total] = await Promise.all([
    Candidate.find(filter)
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('job_id', 'title'),
    Candidate.countDocuments(filter),
  ]);
  return { items, total, page, limit };
}

async function getCandidate(id, userId) {
  const candidate = await Candidate.findById(id).populate('job_id');
  if (!candidate) throw new ApiError(404, 'Candidate not found');
  if (candidate.job_id.created_by.toString() !== userId.toString()) {
    throw new ApiError(403, 'Not your candidate');
  }
  return candidate;
}

module.exports = { createApplication, listCandidates, getCandidate, extractPdfText };
