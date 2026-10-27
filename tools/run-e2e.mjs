#!/usr/bin/env node
// test:e2e entry point (CONSTRAINTS.md §2, PR level). API suites: Vitest with real PostgreSQL, from
// Testcontainers or from TEST_DATABASE_ADMIN_URL (US-007). UI suites (Playwright) arrive with US-066.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const top = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
process.chdir(top);
// Local runs: .env may carry TEST_DATABASE_ADMIN_URL (no Docker); the process environment wins.
if (existsSync('.env')) process.loadEnvFile('.env');

const suites = [
  { dir: 'apps/api/test', label: 'API (integración)', args: ['run', '--config', 'vitest.e2e.config.ts'] },
  { dir: 'apps/web/e2e', label: 'UI (Playwright)', args: null },
];
const present = suites.filter((s) => existsSync(s.dir));
if (present.length === 0) {
  console.log('test:e2e: todavía no hay suites e2e (llegan con US-007 y US-066).');
  process.exit(0);
}
for (const suite of present) {
  if (!suite.args) {
    console.error(`test:e2e: hay suites en ${suite.dir} pero este script aún no las ejecuta.`);
    process.exit(1);
  }
  console.log(`\n▶ test:e2e — ${suite.label}`);
  const run = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', ...suite.args, ...process.argv.slice(2)], {
    stdio: 'inherit',
  });
  if (run.status !== 0) process.exit(run.status ?? 2);
}
