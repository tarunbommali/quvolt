module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'services/**/*.js',
    'jobs/**/*.js',
    '!**/node_modules/**'
  ],
  testTimeout: 30000,
  verbose: true
};
