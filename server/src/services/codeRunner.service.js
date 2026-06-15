/**
 * Runs candidate code against test cases using the free public Wandbox API
 * (https://github.com/melpon/wandbox) - no API key required, which keeps
 * AgentHire's "no keys to run the demo" guarantee. Every function degrades
 * gracefully: if Wandbox is unreachable, callers fall back to simply storing
 * the submission without an execution score.
 *
 * A self-hosted runner can be used instead by setting WANDBOX_URL.
 */

const env = require('../config/env');

const WANDBOX_URL = env.WANDBOX_URL || 'https://wandbox.org';

// Our language codes -> Wandbox compiler identifiers.
const COMPILER = {
  python: 'cpython-3.13.8',
  cpp: 'gcc-13.2.0',
  java: 'openjdk-jdk-21+35',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Transient sandbox/infra failures (vs. genuine user code errors) worth a retry.
function isInfraError(text) {
  return /OCI runtime|Resource temporarily|temporarily unavailable|clone:/i.test(text || '');
}

async function executeOnce({ language, code, stdin }) {
  const compiler = COMPILER[language] || COMPILER.python;
  const res = await fetch(`${WANDBOX_URL}/api/compile.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ compiler, code: code || '', stdin: stdin || '' }),
  });
  if (!res.ok) throw new Error('Code execution failed');
  const data = await res.json();
  return {
    stdout: data.program_output || '',
    stderr: data.program_error || '',
    compileError: data.compiler_error || '',
  };
}

// Executes a program, retrying a couple of times on transient sandbox errors
// so grading isn't flaky. Throws only on repeated transport failures.
async function runCode({ language, code, stdin }) {
  let last;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (attempt > 0) await sleep(600 * attempt);
    last = await executeOnce({ language, code, stdin });
    if (!isInfraError(last.stderr) && !isInfraError(last.compileError)) return last;
  }
  return last;
}

// Compares program output to expected, ignoring trailing whitespace per line
// and surrounding blank lines.
function normalize(s) {
  return String(s ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .trim();
}

/**
 * Runs code against a list of { input, expected_output } tests.
 * `reveal` controls whether expected/actual output is included in each result
 * (true for sample tests, false for hidden tests).
 */
async function runTests({ language, code, tests, reveal = true }) {
  const results = [];
  for (let i = 0; i < tests.length; i += 1) {
    const t = tests[i];
    if (i > 0) await sleep(250); // space out compiles to ease load on the sandbox
    let passed = false;
    let actual = '';
    let error = '';
    try {
      const out = await runCode({ language, code, stdin: t.input });
      actual = out.stdout;
      error = out.compileError || out.stderr || '';
      passed = !out.compileError && normalize(actual) === normalize(t.expected_output);
    } catch {
      error = 'Execution service unavailable';
    }
    const entry = { passed };
    if (reveal) {
      entry.input = t.input;
      entry.expected = t.expected_output;
      entry.actual = actual;
      entry.error = error ? error.slice(0, 500) : '';
    }
    results.push(entry);
  }
  return results;
}

function isConfigured() {
  return true; // public API, no key needed
}

module.exports = { runCode, runTests, isConfigured };
