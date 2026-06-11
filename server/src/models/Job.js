const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    required_skills: { type: [String], required: true },
    preferred_skills: { type: [String], default: [] },
    min_experience: { type: Number, default: 0 },
    workflow_spec_id: { type: String, default: 'default-hiring-workflow' },
    hiring_spec_id: { type: String, default: 'frontend-developer' },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

module.exports = mongoose.model('Job', jobSchema);
