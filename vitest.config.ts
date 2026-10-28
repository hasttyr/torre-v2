import { defineConfig } from 'vitest/config';
export default defineConfig({
  // Workspace packages export their TypeScript sources under this condition (ADR-0001). Vitest resolves
  // modules on the server side, so the condition must also be declared for SSR.
  resolve: { conditions: ['@torre/source', 'module', 'browser', 'development|production'] },
  ssr: { resolve: { conditions: ['@torre/source', 'module', 'node', 'development|production'] } },
  test: {
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts', 'apps/api/src/**/*.ts'],
      exclude: [
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/__tests__/**',
        'packages/testing/**',
        'apps/api/src/database/generated/**',
      ],
      reporter: ['text-summary', 'lcov', 'html', 'json-summary'],
      reportsDirectory: 'coverage',
      // CONSTRAINTS.md §2. The domain is judged on unit tests alone; apps/api on unit and integration
      // together (vitest.coverage.config.ts, `pnpm test:coverage`, DEC-094).
      thresholds: {
        'packages/*/src/**': { lines: 90, branches: 90 },
      },
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'tools',
          include: ['tools/**/*.test.mjs'],
          testTimeout: 60_000,
          // Benchmarks belong to the packages project; without this the default include also picks them up here.
          benchmark: { include: [] },
        },
      },
      {
        extends: true,
        test: {
          name: 'packages',
          include: ['packages/*/src/**/*.spec.ts'],
          setupFiles: ['tools/vitest/fast-check.setup.ts'],
          // Benchmarks with a budget run in their own isolated group after the tests (US-096:AC4): reduced
          // in every run, full at night (BENCH_MODE=full, tools/nightly.mjs).
          benchmark: {
            enabled: true,
            include: ['packages/*/test/bench/**/*.bench.ts'],
            retainSamples: true,
          },
          provide: { benchMode: process.env['BENCH_MODE'] === 'full' ? 'full' : 'reduced' },
        },
      },
      // The web app brings its own config (Vue plugin, happy-dom): apps/web/vite.config.ts (US-009).
      'apps/web/vite.config.ts',
      {
        extends: true,
        test: {
          name: 'api',
          include: ['apps/api/src/**/*.spec.ts'],
          // Properties of the authorization rules (INV-T-7, US-024c) use the same parameters.
          setupFiles: ['tools/vitest/fast-check.setup.ts'],
          benchmark: { include: [] },
        },
      },
    ],
  },
});
