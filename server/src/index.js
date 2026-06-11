const env = require('./config/env');
const { connectDB } = require('./config/db');
const createApp = require('./app');
const { info } = require('./utils/logger');
const { resumeInFlightWorkflows } = require('./services/workflow.service');

async function main() {
  await connectDB();
  info('MongoDB connected');

  const app = createApp();
  app.listen(env.PORT, () => info(`AgentHire API listening on http://localhost:${env.PORT}`));

  // Pick up workflows that were mid-run when the server last stopped.
  resumeInFlightWorkflows().catch((err) => info('Resume sweep failed:', err.message));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal startup error:', err);
  process.exit(1);
});
