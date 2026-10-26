#!/usr/bin/env node
// pnpm test:trace — writes reports/traceability.md and fails when the CI rule of TEST-PLAN.md §6.2.1 is broken.
// Options: --stories <dir> --plan <file> --results <a.json,b.json> --out <file>
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePlanCases, parseResults, parseStories, renderTraceability, trace } from './lib/trace.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};

const stories = parseStories(resolve(root, arg('stories', 'docs/stories')));
const cases = parsePlanCases(resolve(root, arg('plan', 'docs/TEST-PLAN.md')));
const resultFiles = arg('results', 'reports/vitest.json,reports/playwright.json')
  .split(',')
  .map((f) => resolve(root, f));
const tests = parseResults(resultFiles, root);
if (tests.length === 0) {
  console.error('test:trace: no hay resultados de pruebas; ejecuta antes `pnpm test:ci`');
  process.exit(2);
}

const result = trace({ stories, cases, tests });
const out = resolve(root, arg('out', 'reports/traceability.md'));
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, renderTraceability(result));

const done = [...stories.values()].filter((s) => s.state === 'DONE');
console.log(`test:trace: ${tests.length} pruebas · ${done.length} historia(s) en DONE · reporte en ${out}`);
if (result.violations.length) {
  console.error(`test:trace: ${result.violations.length} incumplimiento(s):`);
  for (const v of result.violations) console.error(`  - ${v}`);
  process.exit(1);
}
console.log('test:trace: regla de CI cumplida');
