const mongoose = require('mongoose');
const { CANDIDATE_STATUS } = require('../constants');

const candidateSchema = new mongoose.Schema(
  {
    job_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
    workflow_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Workflow' },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    resume_url: { type: String, required: true },
    parsed_resume_json: { type: mongoose.Schema.Types.Mixed, default: null },
    match_score: { type: Number, default: null },
    status: {
      type: String,
      enum: Object.values(CANDIDATE_STATUS),
      default: CANDIDATE_STATUS.APPLIED,
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

candidateSchema.index({ job_id: 1, email: 1 }, { unique: true });

module.exports = mongoose.model('Candidate', candidateSchema);
