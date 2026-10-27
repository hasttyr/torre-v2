import { defineConfig } from 'vitest/config';
// Integration and e2e suites (`pnpm test:e2e`, tools/run-e2e.mjs). They need real services, so they
// stay out of `pnpm test` (CONSTRAINTS.md §2: PR level).
export default defineConfig({
  // Same source condition as vitest.config.ts (ADR-0001).
  resolve: { conditions: ['@torre/source', 'module', 'browser', 'development|production'] },
  ssr: { resolve: { conditions: ['@torre/source', 'module', 'node', 'development|production'] } },
  test: {
    // Collected for `pnpm test:coverage`, which merges it with the unit coverage and holds the thresholds
    // (DEC-094); this run alone judges nothing.
    coverage: {
      provider: 'v8',
      include: ['apps/api/src/**/*.ts'],
      exclude: ['**/*.spec.ts', '**/__tests__/**', 'apps/api/src/database/generated/**'],
      reporter: ['text-summary'],
      reportsDirectory: 'coverage/e2e',
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'api-integration',
          include: ['apps/api/test/**/*.spec.ts'],
          // Starts PostgreSQL (Testcontainers or TEST_DATABASE_ADMIN_URL) and migrates a template once (US-007).
          globalSetup: ['apps/api/test/support/global-setup.ts'],
          testTimeout: 30_000,
          hookTimeout: 180_000,
          // No retries: a test that passes only on retry is a failure (CONSTRAINTS.md §2).
          retry: 0,
        },
      },
    ],
  },
});
