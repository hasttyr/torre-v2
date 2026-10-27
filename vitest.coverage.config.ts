import { defineConfig, mergeConfig } from 'vitest/config';
import unit from './vitest.config.ts';

// `pnpm test:coverage` (DEC-094): merges the blob reports of `pnpm test:ci` (unit) and `pnpm test:e2e`
// (integration) and judges the coverage of both together. Code that talks to PostgreSQL or Redis is
// proven by the integration suites, so apps/api is measured on the two kinds of tests at once;
// the domain keeps its unit-only threshold from vitest.config.ts (CONSTRAINTS.md §2).
export default mergeConfig(
  unit,
  defineConfig({
    test: {
      coverage: {
        thresholds: { 'apps/api/src/**': { lines: 80 } },
      },
    },
  }),
);
