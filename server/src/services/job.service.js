const Job = require('../models/Job');
const Candidate = require('../models/Candidate');
const Workflow = require('../models/Workflow');
const InterviewSession = require('../models/InterviewSession');
const { ApiError } = require('../utils/errors');

async function createJob(data, userId) {
  return Job.create({ ...data, created_by: userId });
}

// Per-job candidate counts (total + by-status) for the given job ids.
async function candidateStatsByJob(jobIds) {
  if (!jobIds.length) return {};
  const rows = await Candidate.aggregate([
    { $match: { job_id: { $in: jobIds } } },
    { $group: { _id: { job: '$job_id', status: '$status' }, count: { $sum: 1 } } },
  ]);
  const stats = {};
  for (const r of rows) {
    const jid = r._id.job.toString();
    if (!stats[jid]) stats[jid] = { total: 0, by_status: {} };
    stats[jid].by_status[r._id.status] = r.count;
    stats[jid].total += r.count;
  }
  return stats;
}

async function listJobs({ page, limit }, userId = null) {
  const filter = userId ? { created_by: userId } : {};
  const [items, total] = await Promise.all([
    Job.find(filter).sort({ created_at: -1 }).skip((page - 1) * limit).limit(limit),
    Job.countDocuments(filter),
  ]);

  // Attach candidate counts only for the recruiter's own list (not public).
  if (userId && items.length) {
    const stats = await candidateStatsByJob(items.map((j) => j._id));
    const withStats = items.map((j) => ({
      ...j.toObject(),
      stats: stats[j._id.toString()] || { total: 0, by_status: {} },
    }));
    return { items: withStats, total, page, limit };
  }
  return { items, total, page, limit };
}

async function getJob(id) {
  const job = await Job.findById(id);
  if (!job) throw new ApiError(404, 'Job not found');
  return job;
}

async function updateJob(id, data, userId) {
  const job = await Job.findById(id);
  if (!job) throw new ApiError(404, 'Job not found');
  if (job.created_by.toString() !== userId.toString()) {
    throw new ApiError(403, 'You can only update your own jobs');
  }
  Object.assign(job, data);
  await job.save();
  return job;
}

async function deleteJob(id, userId) {
  const job = await Job.findById(id);
  if (!job) throw new ApiError(404, 'Job not found');
  if (job.created_by.toString() !== userId.toString()) {
    throw new ApiError(403, 'You can only delete your own jobs');
  }
  await Promise.all([
    Candidate.deleteMany({ job_id: job._id }),
    Workflow.deleteMany({ job_id: job._id }),
    InterviewSession.deleteMany({ job_id: job._id }),
  ]);
  await job.deleteOne();
}

module.exports = { createJob, listJobs, getJob, updateJob, deleteJob };
