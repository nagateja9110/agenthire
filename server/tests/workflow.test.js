const request = require('supertest');
const createApp = require('../src/app');
const Workflow = require('../src/models/Workflow');
const WorkflowLog = require('../src/models/WorkflowLog');
const Candidate = require('../src/models/Candidate');
const { makeResumePdf, SAMPLE_RESUME_LINES } = require('./helpers/pdf');

const app = createApp();

let token;
let jobId;
let workflowId;
let candidateId;

beforeAll(async () => {
  const signup = await request(app)
    .post('/auth/signup')
    .send({ name: 'Workflow Tester', email: 'wf@test.com', password: 'password123' });
  token = signup.body.data.token;

  const job = await request(app)
    .post('/jobs')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: 'Frontend Developer',
      description: 'React-focused frontend role for the workflow test.',
      required_skills: ['React', 'JavaScript', 'CSS'],
      preferred_skills: ['Next.js', 'Tailwind CSS'],
      min_experience: 2,
    });
  jobId = job.body.data.job._id;
});

describe('End-to-end workflow execution', () => {
  test('upload starts the workflow and it pauses at human_approval', async () => {
    const pdf = makeResumePdf(SAMPLE_RESUME_LINES);
    const res = await request(app)
      .post('/candidates/upload')
      .field('job_id', jobId)
      .field('name', 'John Doe')
      .field('email', 'john.wf@example.com')
      .field('phone', '+919876543210')
      .attach('resume', pdf, { filename: 'resume.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(201);
    workflowId = res.body.data.workflow_id;
    candidateId = res.body.data.candidate_id;

    const workflow = await waitFor(async () => {
      const wf = await Workflow.findById(workflowId);
      return wf && wf.status === 'waiting_approval' ? wf : null;
    });

    expect(workflow.current_state).toBe('human_approval');
    expect(workflow.spec_snapshot.workflow).toEqual([
      'resume_parser',
      'embedding_agent',
      'matching_agent',
      'shortlisting_agent',
      'human_approval',
      'interview_agent',
      'email_agent',
    ]);
  });

  test('agents executed in spec order before the pause', async () => {
    const logs = await WorkflowLog.find({ workflow_id: workflowId, status: 'success' }).sort({
      created_at: 1,
    });
    const order = logs.map((l) => l.agent_name);
    expect(order).toEqual(['resume_parser', 'embedding_agent', 'matching_agent', 'shortlisting_agent']);
  });

  test('candidate was scored and shortlisted deterministically', async () => {
    const candidate = await Candidate.findById(candidateId);
    expect(candidate.match_score).toBe(100); // full skill + experience match
    expect(['shortlisted', 'hold']).toContain(candidate.status);
    expect(candidate.parsed_resume_json.skills).toEqual(expect.arrayContaining(['React', 'CSS']));
  });

  test('workflow detail endpoint returns node states and colors', async () => {
    const res = await request(app)
      .get(`/workflow/${workflowId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const { node_states, node_state_colors } = res.body.data;
    const byAgent = Object.fromEntries(node_states.map((n) => [n.agent, n.state]));
    expect(byAgent.resume_parser).toBe('success');
    expect(byAgent.human_approval).toBe('waiting_approval');
    expect(byAgent.interview_agent).toBe('pending');
    expect(node_state_colors.running.color).toBeTruthy();
  });

  test('approve resumes from checkpoint and completes through interview + email', async () => {
    const res = await request(app)
      .post('/workflow/approve')
      .set('Authorization', `Bearer ${token}`)
      .send({ workflow_id: workflowId, decision: 'approved' });
    expect(res.status).toBe(200);

    const workflow = await waitFor(async () => {
      const wf = await Workflow.findById(workflowId);
      return wf && wf.status === 'completed' ? wf : null;
    });

    expect(workflow.state_output.interview_agent.questions.length).toBeGreaterThan(0);
    expect(workflow.state_output.email_agent.template_id).toBe('interview-invite');
    expect(workflow.state_output.email_agent.fallback).toBe(true); // no RESEND_API_KEY in tests

    const candidate = await Candidate.findById(candidateId);
    expect(candidate.status).toBe('invited');
  });

  test('approving twice fails with 409', async () => {
    const res = await request(app)
      .post('/workflow/approve')
      .set('Authorization', `Bearer ${token}`)
      .send({ workflow_id: workflowId, decision: 'approved' });
    expect(res.status).toBe(409);
  });

  test('workflow list is scoped and shows the completed run', async () => {
    const res = await request(app).get('/workflows').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const found = res.body.data.items.find((w) => w._id === workflowId);
    expect(found).toBeTruthy();
    expect(found.status).toBe('completed');
  });
});

describe('Rejection branch', () => {
  test('weak resume is rejected and routes straight to rejection email (skips approval and interview)', async () => {
    const weakPdf = makeResumePdf([
      'Sam Cook',
      'Junior cobol developer, no front end experience.',
      'Skills: COBOL, Fortran',
    ]);
    const res = await request(app)
      .post('/candidates/upload')
      .field('job_id', jobId)
      .field('name', 'Sam Cook')
      .field('email', 'sam.weak@example.com')
      .field('phone', '+911234567890')
      .attach('resume', weakPdf, { filename: 'weak.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(201);
    const weakWorkflowId = res.body.data.workflow_id;

    const workflow = await waitFor(async () => {
      const wf = await Workflow.findById(weakWorkflowId);
      return wf && wf.status === 'completed' ? wf : null;
    });

    expect(workflow.state_output.email_agent.template_id).toBe('rejection');
    expect(workflow.state_output.interview_agent).toBeUndefined();

    const logs = await WorkflowLog.find({ workflow_id: weakWorkflowId });
    expect(logs.some((l) => l.agent_name === 'human_approval')).toBe(false);
    expect(logs.some((l) => l.agent_name === 'interview_agent')).toBe(false);

    const candidate = await Candidate.findById(res.body.data.candidate_id);
    expect(candidate.status).toBe('rejected');
  });
});

describe('Analytics', () => {
  test('overview aggregates totals, rates, and agent metrics', async () => {
    const res = await request(app).get('/analytics').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const { totals, rates, agent_metrics } = res.body.data;
    expect(totals.candidates).toBeGreaterThanOrEqual(2);
    expect(rates.workflow_completion_rate).toBeGreaterThan(0);
    const agents = agent_metrics.map((m) => m.agent);
    expect(agents).toEqual(expect.arrayContaining(['resume_parser', 'matching_agent', 'email_agent']));
  });
});
