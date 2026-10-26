#!/usr/bin/env node
// pnpm test:smoke — smoke cases of TEST-PLAN.md §13.5. TC-080 runs now; TC-081 (API boots) arrives with
// US-005/US-006, TC-082 (web loads) with US-009/US-066 and TC-083 (clean clone) runs in CI (quality job).
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
console.log('▶ TC-080: infraestructura local (pnpm infra:check)');
const r = spawnSync(process.execPath, ['tools/infra.mjs', 'check'], { cwd: root, stdio: 'inherit' });
console.log('· TC-081 y TC-082 llegan con US-005/US-006 y US-009/US-066; TC-083 corre en la CI.');
process.exit(r.status ?? 2);
