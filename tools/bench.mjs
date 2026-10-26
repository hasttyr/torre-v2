#!/usr/bin/env node
// pnpm bench — benchmarks with budgets in full mode (TEST-PLAN.md §6.1, US-096). Every `pnpm test` already
// runs them in reduced mode; this runs only the benchmarks, longer, and writes reports/bench.json.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const result = spawnSync(
  process.execPath,
  [
    'node_modules/vitest/vitest.mjs',
    'bench',
    '--run',
    '--reporter=default',
    '--reporter=json',
    '--outputFile.json=reports/bench.json',
    ...process.argv.slice(2),
  ],
  { cwd: root, env: { ...process.env, BENCH_MODE: process.env.BENCH_MODE ?? 'full' }, stdio: 'inherit' },
);
process.exit(result.status ?? 1);
