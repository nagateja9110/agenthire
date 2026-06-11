const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  timeout: 120000,
  expect: { timeout: 15000 },
  retries: 0,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: [
    {
      command: 'npm run dev --prefix ../server',
      url: 'http://localhost:5001/health',
      reuseExistingServer: true,
      timeout: 30000,
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: true,
      timeout: 60000,
    },
  ],
});
