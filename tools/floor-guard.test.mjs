import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const guard = fileURLToPath(new URL('./floor-guard.mjs', import.meta.url));

const CONSTRAINTS = [
  '# Constraints',
  '',
  '| Dimensión | Regla | Comprobado por |',
  '|---|---|---|',
  '| Cobertura del dominio | ≥ 90 % de líneas | Vitest |',
  '| Rendimiento | regresión ≤ 30 % | benchmarks |',
  '',
].join('\n');

let repo;

const git = (...args) =>
  execFileSync('git', ['-c', 'user.name=Floor Guard Test', '-c', 'user.email=test@example.invalid', ...args], {
    cwd: repo,
    stdio: 'pipe',
  });

const put = (path, content) => {
  const full = join(repo, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content);
};

const runGuard = (...args) => {
  const r = spawnSync(process.execPath, [guard, ...args], { cwd: repo, encoding: 'utf8' });
  return { status: r.status, output: `${r.stdout}${r.stderr}` };
};

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), 'floor-guard-'));
  git('init', '-q', '-b', 'main');
  put('CONSTRAINTS.md', CONSTRAINTS);
  put('packages/core/src/index.ts', 'export const answer = 42;\n');
  put('packages/core/src/index.spec.ts', "it('works', () => { expect(1).toBe(1); });\n");
  git('add', '-A');
  git('commit', '-q', '-m', 'chore: base');
  git('switch', '-q', '-c', 'feature');
});

afterEach(() => {
  rmSync(repo, { recursive: true, force: true });
});

describe('floor-guard (CONSTRAINTS.md §1)', () => {
  it('[US-001:AC8] should exit 0 when the change lowers nothing', () => {
    put('packages/core/src/sum.ts', 'export const sum = (a: number, b: number): number => a + b;\n');

    const result = runGuard('--base', 'main');

    expect(result.status, result.output).toBe(0);
  });

  it('[US-001:AC8] should exit 1 when a new @ts-ignore appears', () => {
    put('packages/core/src/sum.ts', '// @ts-ignore\nexport const sum = 1;\n');

    const result = runGuard('--base', 'main');

    expect(result.status).toBe(1);
    expect(result.output).toContain('silenced-checker');
  });

  it('[US-001:AC8] should exit 1 when a threshold in CONSTRAINTS.md is lowered', () => {
    put('CONSTRAINTS.md', CONSTRAINTS.replace('≥ 90 %', '≥ 80 %'));

    const result = runGuard('--base', 'main');

    expect(result.status).toBe(1);
    expect(result.output).toContain('threshold-loosened');
  });

  it('[US-001:AC8] should stay silent when a threshold is tightened', () => {
    put('CONSTRAINTS.md', CONSTRAINTS.replace('≤ 30 %', '≤ 20 %'));

    const result = runGuard('--base', 'main');

    expect(result.status, result.output).toBe(0);
  });

  it('[US-001:AC8] should flag a TODO without reference but accept TODO(OQ-001)', () => {
    put('packages/core/src/a.ts', '// TODO(OQ-001): ASCUN value\nexport const a = 1;\n');
    expect(runGuard('--base', 'main').status).toBe(0);

    put('packages/core/src/b.ts', '// TODO fix later\nexport const b = 1;\n');
    const result = runGuard('--base', 'main');

    expect(result.status).toBe(1);
    expect(result.output).toContain('todo-without-reference');
  });

  it('[US-001:AC8] should flag a skipped test and a removed assertion', () => {
    put('packages/core/src/index.spec.ts', "it.skip('works', () => {});\n");

    const result = runGuard('--base', 'main');

    expect(result.status).toBe(1);
    expect(result.output).toContain('test-made-easier');
    expect(result.output).toContain('assertion-removed');
  });

  it('[US-001:AC8] should flag clock or randomness in a domain package', () => {
    put('packages/core/src/now.ts', 'export const now = (): number => Date.now();\n');

    const result = runGuard('--base', 'main');

    expect(result.status).toBe(1);
    expect(result.output).toContain('impure-domain');
  });

  it('[US-001:AC8] should flag an UPDATE on the events table', () => {
    put('apps/api/prisma/migrations/0002/migration.sql', 'UPDATE events SET payload = NULL;\n');

    const result = runGuard('--base', 'main');

    expect(result.status).toBe(1);
    expect(result.output).toContain('mutates-immutable-table');
  });

  it('[US-001:AC8] should exit 2 when it cannot find the base', () => {
    const result = runGuard('--base', 'does-not-exist');

    expect(result.status).toBe(2);
  });
});
