/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  verbose: false,
  silent: false,
  reporters: [
    'default'
  ],
  testEnvironment: "node",
  transform: {
    "^.+.tsx?$": ["ts-jest",{}],
  },
  testPathIgnorePatterns: [
    "/node_modules/",
    ".d.ts",
    ".js",
  ],
  testTimeout: 10000,
  preset: '@shelf/jest-dynamodb',
  resetModules: true,
  collectCoverage: true,
  collectCoverageFrom: [
    "src/**/*.{js,ts}",
    "!src/**/*.test.{js,ts}",
    "!src/**/*.d.ts",
    "!src/constants.{js,ts}"
  ],
  coverageDirectory: "coverage",
  coverageReporters: [
    "text",
    "lcov",
    "html",
    "json",
    "json-summary"
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
};
