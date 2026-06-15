const mongoose = require('mongoose');
const { INTERVIEW_STATUS } = require('../constants');

// One turn in the conversation transcript.
const turnSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['interviewer', 'candidate'], required: true },
    text: { type: String, default: '' },
    question_index: { type: Number, default: null },
    input_mode: { type: String, enum: ['voice', 'text', null], default: null },
  },
  { _id: false, timestamps: { createdAt: 'created_at', updatedAt: false } }
);

// AI evaluation of one rubric criterion.
const criterionScoreSchema = new mongoose.Schema(
  {
    criterion: { type: String, required: true },
    level: { type: String, enum: ['strong_no', 'no', 'yes', 'strong_yes', 'not_assessed'], default: 'not_assessed' },
    note: { type: String, default: '' },
  },
  { _id: false }
);

// AI evaluation against one of the 5 fixed scorecard categories.
const categoryScoreSchema = new mongoose.Schema(
  {
    category: { type: String, required: true },
    score: { type: Number, default: null },
    note: { type: String, default: '' },
  },
  { _id: false }
);

// A coding-task test case (sample tests are shown; hidden tests are not).
const testCaseSchema = new mongoose.Schema(
  {
    input: { type: String, default: '' },
    expected_output: { type: String, default: '' },
    explanation: { type: String, default: '' },
  },
  { _id: false }
);

const interviewSessionSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, unique: true, index: true },
    candidate_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true, index: true },
    job_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    workflow_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Workflow' },
    status: {
      type: String,
      enum: Object.values(INTERVIEW_STATUS),
      default: INTERVIEW_STATUS.PENDING,
      index: true,
    },
    // Fallback seed questions from interview_agent (used only if no LLM).
    questions: [{ topic: String, question: String }],
    rubric: [{ criterion: String, description: String }],
    // LeetCode-style coding task presented after Q&A. Hidden tests are stored
    // here but never exposed in the candidate-facing publicView.
    coding_task: {
      id: { type: String, default: null },
      title: { type: String, default: null },
      difficulty: { type: String, default: null },
      description: { type: String, default: null },
      starter_code: {
        python: { type: String, default: '' },
        cpp: { type: String, default: '' },
        java: { type: String, default: '' },
      },
      sample_tests: { type: [testCaseSchema], default: [] },
      hidden_tests: { type: [testCaseSchema], default: [] },
    },
    code_submission: {
      language: { type: String, default: null },
      code: { type: String, default: null },
      passed: { type: Number, default: null },
      total: { type: Number, default: null },
      submitted_at: { type: Date, default: null },
    },
    // Context the conductor grounds each dynamic question in.
    resume_context: {
      skills: { type: [String], default: [] },
      experience: { type: Number, default: null },
      education: { type: String, default: null },
      projects: { type: [{ title: String, description: String }], default: [] },
    },
    job_context: {
      role: { type: String, default: '' },
      required_skills: { type: [String], default: [] },
      preferred_skills: { type: [String], default: [] },
    },
    target_questions: { type: Number, default: 5 },
    asked_count: { type: Number, default: 0 },
    // The question currently awaiting an answer (generated on demand).
    pending_question: {
      question: { type: String, default: null },
      topic: { type: String, default: null },
      is_follow_up: { type: Boolean, default: false },
    },
    conductor_engine: { type: String, default: null },
    current_index: { type: Number, default: 0 },
    transcript: { type: [turnSchema], default: [] },
    evaluation: {
      criteria: { type: [criterionScoreSchema], default: [] },
      category_scores: { type: [categoryScoreSchema], default: [] },
      summary: { type: String, default: '' },
      recommendation: { type: String, enum: ['advance', 'borderline', 'do_not_advance', null], default: null },
      overall_score: { type: Number, default: null },
      engine: { type: String, default: null },
    },
    // Candidate-safe feedback (no score / no hire verdict) shown after finishing.
    candidate_feedback: {
      summary: { type: String, default: '' },
      strengths: { type: [String], default: [] },
      improvements: { type: [String], default: [] },
    },
    expires_at: { type: Date, required: true },
    started_at: { type: Date, default: null },
    completed_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

module.exports = mongoose.model('InterviewSession', interviewSessionSchema);
