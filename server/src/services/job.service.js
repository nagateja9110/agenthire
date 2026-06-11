const Job = require('../models/Job');
const { ApiError } = require('../utils/errors');

async function createJob(data, userId) {
  return Job.create({ ...data, created_by: userId });
}

async function listJobs({ page, limit }, userId = null) {
  const filter = userId ? { created_by: userId } : {};
  const [items, total] = await Promise.all([
    Job.find(filter).sort({ created_at: -1 }).skip((page - 1) * limit).limit(limit),
    Job.countDocuments(filter),
  ]);
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

module.exports = { createJob, listJobs, getJob, updateJob };
