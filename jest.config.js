module.exports = {
  testEnvironment: 'node',
  modulePathIgnorePatterns: ['<rootDir>/apps/web/.next/'],
  testMatch: ['**/apps/server/tests/**/*.test.js'],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: { branches: 70, functions: 70, lines: 70, statements: 70 },
  },
};
