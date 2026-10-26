#!/usr/bin/env node
// test:e2e entry point. The API suites (Testcontainers) arrive with US-022 and the UI suites
// (Playwright) with US-066; until a suite exists the command reports it and succeeds (US-001:AC3).
import { existsSync } from 'node:fs';

const suites = [
  { dir: 'apps/api/test', label: 'API (Testcontainers)' },
  { dir: 'apps/web/e2e', label: 'UI (Playwright)' },
];
const present = suites.filter((s) => existsSync(s.dir));
if (present.length === 0) {
  console.log('test:e2e: todavía no hay suites e2e (llegan con US-022 y US-066).');
  process.exit(0);
}
console.error(`test:e2e: hay suites en ${present.map((s) => s.dir).join(', ')} pero este script aún no las ejecuta.`);
process.exit(1);
