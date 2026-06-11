const WORKFLOW_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  WAITING_APPROVAL: 'waiting_approval',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

const LOG_STATUS = {
  RUNNING: 'running',
  SUCCESS: 'success',
  FAILED: 'failed',
  WAITING_APPROVAL: 'waiting_approval',
};

const CANDIDATE_STATUS = {
  APPLIED: 'applied',
  PROCESSING: 'processing',
  SHORTLISTED: 'shortlisted',
  HOLD: 'hold',
  REJECTED: 'rejected',
  INVITED: 'invited',
};

const SHORTLIST_DECISION = {
  SHORTLISTED: 'shortlisted',
  HOLD: 'hold',
  REJECTED: 'rejected',
};

const AGENTS = {
  RESUME_PARSER: 'resume_parser',
  EMBEDDING_AGENT: 'embedding_agent',
  MATCHING_AGENT: 'matching_agent',
  SHORTLISTING_AGENT: 'shortlisting_agent',
  HUMAN_APPROVAL: 'human_approval',
  INTERVIEW_AGENT: 'interview_agent',
  EMAIL_AGENT: 'email_agent',
};

const ROLES = {
  RECRUITER: 'recruiter',
};

module.exports = { WORKFLOW_STATUS, LOG_STATUS, CANDIDATE_STATUS, SHORTLIST_DECISION, AGENTS, ROLES };
