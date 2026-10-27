import { defineConfig } from 'vitest/config';
// Integration and e2e suites (`pnpm test:e2e`, tools/run-e2e.mjs). They need real services, so they
// stay out of `pnpm test` (CONSTRAINTS.md §2: PR level).
export default defineConfig({
  // Same source condition as vitest.config.ts (ADR-0001).
  resolve: { conditions: ['@torre/source', 'module', 'browser', 'development|production'] },
  ssr: { resolve: { conditions: ['@torre/source', 'module', 'node', 'development|production'] } },
  test: {
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
