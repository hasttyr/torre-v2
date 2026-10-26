#!/usr/bin/env node
// verify-fast.mjs: the fast check of CONSTRAINTS.md §5, scoped to what the change touched.
// Order: floor guard → lint (changed files) → typecheck (affected workspaces) → dependency rules →
// secrets → related tests. Stops at the first failure. Budget: 90 s.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const BUDGET_MS = 90_000;
const started = Date.now();
const top = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
process.chdir(top);

const node = (script, args, label) => {
  const t0 = Date.now();
  console.log(`\n▶ ${label}`);
  const r = spawnSync(process.execPath, [script, ...args], { stdio: 'inherit' });
  console.log(`  ${label}: ${r.status === 0 ? 'ok' : 'FALLA'} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  if (r.status !== 0) {
    console.error(`\nverify:fast se detuvo en: ${label}`);
    process.exit(r.status ?? 2);
  }
};

const base = [process.env.FLOOR_GUARD_BASE, 'origin/main', 'main'].find(
  (ref) => ref && spawnSync('git', ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]).status === 0,
);
const mergeBase = base ? execFileSync('git', ['merge-base', base, 'HEAD'], { encoding: 'utf8' }).trim() : null;
const changed = [
  ...(mergeBase ? execFileSync('git', ['diff', '--name-only', mergeBase, '--'], { encoding: 'utf8' }).split('\n') : []),
  ...execFileSync('git', ['ls-files', '--others', '--exclude-standard'], { encoding: 'utf8' }).split('\n'),
]
  .map((f) => f.trim())
  .filter((f) => f && existsSync(f));
const unique = [...new Set(changed)];
console.log(`verify:fast — base ${base ?? '(ninguna)'} · ${unique.length} archivo(s) cambiado(s)`);

// Root-level configuration affects every workspace.
const GLOBAL =
  /^(package\.json|pnpm-workspace\.yaml|pnpm-lock\.yaml|tsconfig[^/]*\.json|eslint\.config\.js|vitest\.config\.ts|\.dependency-cruiser\.cjs|packages\/config\/)/;
const touchesAll = unique.some((f) => GLOBAL.test(f));
const workspaces = ['apps', 'packages'].flatMap((d) =>
  readdirSync(d, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(d, e.name, 'tsconfig.json')))
    .map((e) => `${d}/${e.name}`),
);
const affected = touchesAll ? workspaces : workspaces.filter((w) => unique.some((f) => f.startsWith(`${w}/`)));

const bin = {
  eslint: 'node_modules/eslint/bin/eslint.js',
  tsc: 'node_modules/typescript/bin/tsc',
  depcruise: 'node_modules/dependency-cruiser/bin/dependency-cruiser.mjs',
  vitest: 'node_modules/vitest/vitest.mjs',
};

node('tools/floor-guard.mjs', base ? ['--base', base] : [], 'piso (check:floor)');

const lintable = unique.filter((f) => /\.(ts|mts|cts|js|mjs|cjs|vue)$/.test(f) && !f.startsWith('docs/'));
if (lintable.length > 0)
  node(bin.eslint, ['--max-warnings=0', '--no-warn-ignored', ...lintable], `lint (${lintable.length} archivo(s))`);
else console.log('\n▶ lint: sin archivos de código cambiados');

for (const w of affected) node(bin.tsc, ['-p', `${w}/tsconfig.json`, '--noEmit'], `typecheck ${w}`);
if (affected.length === 0) console.log('\n▶ typecheck: ningún workspace afectado');

node(
  bin.depcruise,
  ['apps', 'packages', '--config', '.dependency-cruiser.cjs', '--output-type', 'err'],
  'límites entre paquetes',
);
node('tools/gitleaks.mjs', base ? ['--base', base] : [], 'secretos (gitleaks)');

const runAllTests = touchesAll || unique.some((f) => /^tools\/.*\.mjs$/.test(f));
const testable = unique.filter((f) => /\.(ts|mts|js|mjs|vue)$/.test(f));
if (runAllTests) node(bin.vitest, ['run'], 'pruebas (todas: cambió configuración o herramientas)');
else if (testable.length > 0)
  node(bin.vitest, ['related', '--run', '--passWithNoTests', ...testable], `pruebas relacionadas (${testable.length})`);
else console.log('\n▶ pruebas: nada relacionado');

const elapsed = Date.now() - started;
console.log(`\nverify:fast: todo en verde en ${(elapsed / 1000).toFixed(1)} s`);
if (elapsed > BUDGET_MS) {
  console.warn(
    `⚠ superó el presupuesto de ${BUDGET_MS / 1000} s: mover controles de "rápido" a "verify" (CONSTRAINTS.md §5).`,
  );
}
