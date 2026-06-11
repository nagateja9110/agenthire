module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  moduleNameMapper: {
    // uuid@14 is ESM-only; Jest cannot require() ESM (Node itself can).
    '^uuid$': '<rootDir>/tests/shims/uuid.js',
  },
  testTimeout: 90000,
};
