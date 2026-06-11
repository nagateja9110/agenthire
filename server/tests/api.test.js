const request = require('supertest');
const createApp = require('../src/app');
const { makeResumePdf, SAMPLE_RESUME_LINES } = require('./helpers/pdf');

const app = createApp();

const recruiter = { name: 'Recruiter One', email: 'r1@test.com', password: 'password123' };
let token;
let jobId;

describe('Auth', () => {
  test('signup creates a recruiter and returns a token', async () => {
    const res = await request(app).post('/auth/signup').send(recruiter);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.role).toBe('recruiter');
    token = res.body.data.token;
  });

  test('duplicate signup is rejected with 409', async () => {
    const res = await request(app).post('/auth/signup').send(recruiter);
    expect(res.status).toBe(409);
  });

  test('login with wrong password fails 401', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: recruiter.email, password: 'wrong-password' });
    expect(res.status).toBe(401);
  });

  test('login succeeds and /auth/me returns the profile', async () => {
    const login = await request(app)
      .post('/auth/login')
      .send({ email: recruiter.email, password: recruiter.password });
    expect(login.status).toBe(200);

    const me = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${login.body.data.token}`);
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe(recruiter.email);
  });

  test('/auth/me without token fails 401', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
  });

  test('invalid signup body fails Zod validation with 400', async () => {
    const res = await request(app)
      .post('/auth/signup')
      .send({ name: 'x', email: 'not-an-email', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error.details.length).toBeGreaterThan(0);
  });
});

describe('Jobs', () => {
  const jobBody = {
    title: 'Frontend Developer',
    description: 'Build delightful recruiter consoles with React and Next.js.',
    required_skills: ['React', 'JavaScript', 'CSS'],
    preferred_skills: ['Next.js', 'Tailwind CSS'],
    min_experience: 2,
  };

  test('creating a job requires auth', async () => {
    const res = await request(app).post('/jobs').send(jobBody);
    expect(res.status).toBe(401);
  });

  test('recruiter can create a job', async () => {
    const res = await request(app)
      .post('/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send(jobBody);
    expect(res.status).toBe(201);
    jobId = res.body.data.job._id;
    expect(res.body.data.job.created_by).toBeTruthy();
  });

  test('public job detail loads without auth', async () => {
    const res = await request(app).get(`/jobs/${jobId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.job.title).toBe(jobBody.title);
  });

  test('public job list loads without auth', async () => {
    const res = await request(app).get('/jobs');
    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThan(0);
  });

  test('another recruiter cannot update the job', async () => {
    const other = await request(app)
      .post('/auth/signup')
      .send({ name: 'Recruiter Two', email: 'r2@test.com', password: 'password123' });
    const res = await request(app)
      .put(`/jobs/${jobId}`)
      .set('Authorization', `Bearer ${other.body.data.token}`)
      .send({ title: 'Hijacked title' });
    expect(res.status).toBe(403);
  });
});

describe('Candidate upload (public)', () => {
  test('rejects non-PDF uploads', async () => {
    const res = await request(app)
      .post('/candidates/upload')
      .field('job_id', jobId)
      .field('name', 'Jane')
      .field('email', 'jane@test.com')
      .field('phone', '9876543210')
      .attach('resume', Buffer.from('plain text'), { filename: 'resume.txt', contentType: 'text/plain' });
    expect(res.status).toBe(400);
  });

  test('accepts a PDF, creates candidate, auto-starts workflow', async () => {
    const pdf = makeResumePdf(SAMPLE_RESUME_LINES);
    const res = await request(app)
      .post('/candidates/upload')
      .field('job_id', jobId)
      .field('name', 'John Doe')
      .field('email', 'john.doe@example.com')
      .field('phone', '+919876543210')
      .attach('resume', pdf, { filename: 'john-react-resume.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(201);
    expect(res.body.data.workflow_id).toBeTruthy();
    expect(['pending', 'running']).toContain(res.body.data.workflow_status);

    // Let the background run reach its pause so suite teardown
    // doesn't disconnect Mongo mid-workflow.
    const Workflow = require('../src/models/Workflow');
    await waitFor(async () => {
      const wf = await Workflow.findById(res.body.data.workflow_id);
      return wf && ['waiting_approval', 'completed', 'failed'].includes(wf.status) ? wf : null;
    });
  });

  test('duplicate application (same email + job) returns 409', async () => {
    const pdf = makeResumePdf(SAMPLE_RESUME_LINES);
    const res = await request(app)
      .post('/candidates/upload')
      .field('job_id', jobId)
      .field('name', 'John Doe')
      .field('email', 'john.doe@example.com')
      .field('phone', '+919876543210')
      .attach('resume', pdf, { filename: 'john-react-resume.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(409);
  });

  test('candidate list requires recruiter auth', async () => {
    const res = await request(app).get('/candidates');
    expect(res.status).toBe(401);
  });

  test('recruiter sees the candidate with job context', async () => {
    const res = await request(app).get('/candidates').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBe(1);
    expect(res.body.data.items[0].job_id.title).toBe('Frontend Developer');
  });
});
