module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/?(*.)+(spec|test).[tj]s?(x)'],
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.{js,ts,tsx}'],
  coveragePathIgnorePatterns: ['tests/'],
  coverageDirectory: 'coverage',
  coverageReporters: ['json', 'lcov', 'text', 'clover'],
  setupFiles: ['dotenv/config'],
};
