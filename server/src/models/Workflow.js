const mongoose = require('mongoose');
const { WORKFLOW_STATUS } = require('../constants');

const workflowSchema = new mongoose.Schema(
  {
    candidate_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true, index: true },
    job_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
    current_state: { type: String, default: null },
    status: {
      type: String,
      enum: Object.values(WORKFLOW_STATUS),
      default: WORKFLOW_STATUS.PENDING,
      index: true,
    },
    spec_snapshot: { type: mongoose.Schema.Types.Mixed, default: null },
    state_output: { type: mongoose.Schema.Types.Mixed, default: {} },
    retries: { type: mongoose.Schema.Types.Mixed, default: {} },
    approval: {
      decision: { type: String, enum: ['approved', 'rejected', null], default: null },
      decided_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      decided_at: { type: Date, default: null },
    },
    error: { type: String, default: null },
    completed_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

module.exports = mongoose.model('Workflow', workflowSchema);
