const mongoose = require('mongoose');
const { LOG_STATUS } = require('../constants');

const workflowLogSchema = new mongoose.Schema(
  {
    workflow_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Workflow', required: true, index: true },
    agent_name: { type: String, required: true },
    input: { type: mongoose.Schema.Types.Mixed, default: null },
    output: { type: mongoose.Schema.Types.Mixed, default: null },
    status: { type: String, enum: Object.values(LOG_STATUS), required: true },
    error: { type: String, default: null },
    attempt: { type: Number, default: 1 },
    duration_ms: { type: Number, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

module.exports = mongoose.model('WorkflowLog', workflowLogSchema);
