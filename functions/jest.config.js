/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          // Override NodeNext -> CommonJS so Jest can run TS without ESM loader
          module: "commonjs",
          moduleResolution: "node",
          esModuleInterop: true,
          strict: true,
        },
      },
    ],
  },
  // Allow Jest's node environment to resolve firebase-admin/firestore etc.
  // via the package.json "exports" field (subpath exports)
  testEnvironmentOptions: {
    customExportConditions: ["node", "node-addons", "require", "default"],
  },
  verbose: true,
  watchAll: false,
  clearMocks: true,
  restoreMocks: true,
  collectCoverageFrom: ["src/**/*.ts", "!src/index.ts"],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],
};
