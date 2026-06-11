const fs = require('fs');
const path = require('path');

const LOGS_DIR = path.join(__dirname, '../../logs');

function ensureLogsDir() {
  if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });
}

function logWorkflowFailure({ workflowId, agentName, state, error }) {
  ensureLogsDir();
  const entry = {
    timestamp: new Date().toISOString(),
    workflow_id: String(workflowId || ''),
    agent_name: agentName,
    workflow_state: state,
    message: error && error.message,
    code: error && error.code,
    stack: error && error.stack,
  };
  const file = path.join(LOGS_DIR, 'workflow-failures.log');
  fs.appendFileSync(file, JSON.stringify(entry) + '\n');
  return entry;
}

function info(...args) {
  // eslint-disable-next-line no-console
  console.log(`[${new Date().toISOString()}]`, ...args);
}

module.exports = { logWorkflowFailure, info, LOGS_DIR };
