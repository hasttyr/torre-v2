import { defineConfig } from 'vitest/config';
import { fastCheckParams } from './tools/lib/fast-check-params.mjs';

const fastCheck = fastCheckParams(process.env);

export default defineConfig({
  resolve: {
    // Workspace packages export their TypeScript sources under this condition (ADR-0001).
    conditions: ['@torre/source'],
  },
  test: {
    passWithNoTests: true,
    // Property tests read these with `inject('fastCheck')` (TESTING.md §9, TEST-PLAN.md §6.2.2).
    provide: { fastCheck },
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts', 'apps/api/src/**/*.ts'],
      exclude: ['**/*.spec.ts', '**/*.test.ts', 'packages/testing/**'],
      reporter: ['text-summary', 'lcov', 'html', 'json-summary'],
      reportsDirectory: 'coverage',
      // CONSTRAINTS.md §2.
      thresholds: {
        'packages/*/src/**': { lines: 90, branches: 90 },
        'apps/api/src/**': { lines: 80 },
      },
    },
    projects: [
      {
        extends: true,
        test: { name: 'tools', include: ['tools/**/*.test.mjs'], testTimeout: 60_000 },
      },
      {
        extends: true,
        test: { name: 'packages', include: ['packages/*/src/**/*.spec.ts'] },
      },
    ],
  },
});
