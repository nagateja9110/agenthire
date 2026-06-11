const Job = require('../models/Job');
const Candidate = require('../models/Candidate');
const Workflow = require('../models/Workflow');
const WorkflowLog = require('../models/WorkflowLog');
const { WORKFLOW_STATUS, CANDIDATE_STATUS } = require('../constants');

async function getOverview(userId) {
  const ownJobIds = await Job.find({ created_by: userId }).distinct('_id');
  const jobFilter = { job_id: { $in: ownJobIds } };

  const [
    jobCount,
    candidateCount,
    workflowCount,
    completedWorkflows,
    failedWorkflows,
    waitingApproval,
    candidatesByStatus,
    agentMetrics,
    recentWorkflows,
    avgScoreAgg,
  ] = await Promise.all([
    Job.countDocuments({ created_by: userId }),
    Candidate.countDocuments(jobFilter),
    Workflow.countDocuments(jobFilter),
    Workflow.countDocuments({ ...jobFilter, status: WORKFLOW_STATUS.COMPLETED }),
    Workflow.countDocuments({ ...jobFilter, status: WORKFLOW_STATUS.FAILED }),
    Workflow.countDocuments({ ...jobFilter, status: WORKFLOW_STATUS.WAITING_APPROVAL }),
    Candidate.aggregate([
      { $match: { job_id: { $in: ownJobIds } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    WorkflowLog.aggregate([
      {
        $lookup: {
          from: 'workflows',
          localField: 'workflow_id',
          foreignField: '_id',
          as: 'workflow',
        },
      },
      { $unwind: '$workflow' },
      { $match: { 'workflow.job_id': { $in: ownJobIds } } },
      {
        $group: {
          _id: '$agent_name',
          executions: { $sum: 1 },
          failures: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          avg_duration_ms: { $avg: '$duration_ms' },
        },
      },
      { $sort: { executions: -1 } },
    ]),
    Workflow.find(jobFilter)
      .sort({ created_at: -1 })
      .limit(5)
      .populate('candidate_id', 'name email')
      .populate('job_id', 'title'),
    Candidate.aggregate([
      { $match: { job_id: { $in: ownJobIds }, match_score: { $ne: null } } },
      { $group: { _id: null, avg: { $avg: '$match_score' } } },
    ]),
  ]);

  const statusCounts = Object.fromEntries(candidatesByStatus.map((s) => [s._id, s.count]));
  const shortlistedCount =
    (statusCounts[CANDIDATE_STATUS.SHORTLISTED] || 0) + (statusCounts[CANDIDATE_STATUS.INVITED] || 0);

  return {
    totals: {
      jobs: jobCount,
      candidates: candidateCount,
      workflows: workflowCount,
      waiting_approval: waitingApproval,
    },
    rates: {
      workflow_completion_rate: workflowCount ? Math.round((completedWorkflows / workflowCount) * 100) : 0,
      workflow_failure_rate: workflowCount ? Math.round((failedWorkflows / workflowCount) * 100) : 0,
      shortlist_rate: candidateCount ? Math.round((shortlistedCount / candidateCount) * 100) : 0,
      average_match_score: avgScoreAgg.length ? Math.round(avgScoreAgg[0].avg) : null,
    },
    candidates_by_status: statusCounts,
    agent_metrics: agentMetrics.map((m) => ({
      agent: m._id,
      executions: m.executions,
      failures: m.failures,
      avg_duration_ms: m.avg_duration_ms != null ? Math.round(m.avg_duration_ms) : null,
    })),
    recent_workflows: recentWorkflows,
  };
}

module.exports = { getOverview };
