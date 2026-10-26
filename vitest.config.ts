import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Workspace packages export their TypeScript sources under this condition (ADR-0001).
    conditions: ['@torre/source'],
  },
  test: {
    passWithNoTests: true,
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
