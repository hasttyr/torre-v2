#!/usr/bin/env node
// pnpm test:nightly (US-004:AC9) — 5 000 property runs with a random seed, e2e and full benchmarks.
// The seed goes to the run manifest so any failure can be replayed with FC_SEED.
import { spawnSync } from 'node:child_process';
import { randomInt } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const env = {
  ...process.env,
  FC_MODE: 'nightly',
  FC_NUM_RUNS: process.env.FC_NUM_RUNS ?? '5000',
  FC_SEED: process.env.FC_SEED ?? String(randomInt(1, 2 ** 31 - 1)),
};
console.log(`test:nightly: fast-check ${env.FC_NUM_RUNS} ejecuciones, semilla ${env.FC_SEED}`);

const step = (label, args) => {
  console.log(`\n▶ ${label}`);
  const r = spawnSync(process.execPath, args, { cwd: root, env, stdio: 'inherit' });
  return r.status === 0;
};

const results = {
  unit: step('pruebas unitarias y de propiedades', [
    'node_modules/vitest/vitest.mjs',
    'run',
    '--coverage',
    '--reporter=default',
    '--reporter=json',
    '--outputFile.json=reports/vitest.json',
    '--reporter=junit',
    '--outputFile.junit=reports/junit.xml',
  ]),
  e2e: step('e2e', ['tools/run-e2e.mjs']),
  bench: step('benchmarks (modo completo)', ['tools/bench.mjs']),
};

const suiteArgs = Object.entries(results).flatMap(([name, ok]) => ['--suite', `${name}=${ok ? 'passed' : 'failed'}`]);
step('manifiesto', ['tools/run-manifest.mjs', ...suiteArgs]);
step('informe', ['tools/test-report.mjs']);

const failed = Object.entries(results)
  .filter(([, ok]) => !ok)
  .map(([name]) => name);
if (failed.length) {
  console.error(`\ntest:nightly: falló ${failed.join(', ')} (semilla ${env.FC_SEED})`);
  process.exit(1);
}
console.log('\ntest:nightly: todo en verde');
