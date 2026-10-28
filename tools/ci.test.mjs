import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { fastCheckParams, PR_RUNS, PR_SEED } from './lib/fast-check-params.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (path) => readFileSync(join(root, path), 'utf8');
const ci = read('.github/workflows/ci.yml');
const nightly = read('.github/workflows/nightly.yml');
const scripts = JSON.parse(read('package.json')).scripts;

/** The `run:` commands of one job, in order. */
function runsOf(job) {
  const start = ci.indexOf(`\n  ${job}:\n`);
  const end = ci.slice(start + 1).search(/\n {2}[a-z-]+:\n/);
  const body = end > -1 ? ci.slice(start, start + 1 + end) : ci.slice(start);
  return [...body.matchAll(/^\s+(?:- )?run: (.+)$/gm)].map((m) => m[1].trim());
}

describe('CI workflow (US-004)', () => {
  it('[US-004:AC1] should install frozen, then lint, typecheck, test and build, in that order', () => {
    const runs = runsOf('quality');
    const order = ['pnpm install --frozen-lockfile', 'pnpm lint', 'pnpm typecheck', 'pnpm test:ci', 'pnpm build'].map(
      (r) => runs.indexOf(r),
    );

    expect(
      order.every((i) => i > -1),
      runs.join('\n'),
    ).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('[US-004:AC2] should take Node from .nvmrc and cache pnpm', () => {
    expect(ci).toContain('node-version-file: .nvmrc');
    expect(ci).toContain('cache: pnpm');
  });

  it('[US-004:AC3] should run the Testcontainers job once integration tests exist', () => {
    expect(ci).toContain("if: hashFiles('apps/api/test/**/*.ts') != ''");
  });

  it('[US-004:AC4] should audit dependencies, scan secrets and run the floor guard', () => {
    expect(runsOf('security')).toEqual(expect.arrayContaining(['pnpm audit --audit-level=high', 'pnpm secrets --all']));
    expect(runsOf('quality')).toContain('pnpm check:floor');
  });

  it('[DEC-102] should put on auto-merge only the owner’s own non-draft PRs to main, and only after the checks', () => {
    const autoMerge = read('.github/workflows/auto-merge.yml');

    expect(autoMerge).toMatch(/branches: \[main\]/);
    expect(autoMerge).toContain('!github.event.pull_request.draft');
    expect(autoMerge).toContain('github.event.pull_request.user.login == github.repository_owner');
    expect(autoMerge).toContain('github.event.pull_request.head.repo.full_name == github.repository');
    // `--auto` waits for the branch protection (the four jobs and an up-to-date branch); it never forces.
    expect(autoMerge).toMatch(/gh pr merge "\$PR" --auto --merge/);
    expect(autoMerge).not.toMatch(/--admin|\$\{\{ github\.event\.pull_request\.(title|body|head\.ref)/);
    expect(autoMerge).toMatch(/^permissions: \{\}$/m);
  });

  it('[US-004:AC5] should document the branch protection that blocks failing PRs', () => {
    const readme = read('README.md');

    expect(readme).toContain('Require status checks to pass');
    for (const job of ['quality', 'security', 'infra']) expect(readme).toContain(`\`${job}\``);
    // Required too: it runs the integration tests and the traceability check.
    expect(readme).toContain('`integration`');
  });

  it('[US-004:AC8] should check traceability once unit and integration results both exist', () => {
    // Criteria of DONE stories may be covered only by integration tests: the quality job alone cannot see them.
    const runs = runsOf('integration');

    expect(runsOf('quality')).not.toContain('pnpm test:trace');
    expect(runs.indexOf('pnpm test:trace')).toBeGreaterThan(runs.indexOf('pnpm test:e2e'));
    expect(runs.indexOf('pnpm test:e2e')).toBeGreaterThan(runs.indexOf('pnpm test:ci'));
  });

  it('[US-004:AC6][US-004:AC7] should upload coverage and JSON/JUnit evidence for 90 days', () => {
    expect(scripts['test:ci']).toContain('--coverage');
    expect(scripts['test:ci']).toContain('--outputFile.json=reports/vitest.json');
    expect(scripts['test:ci']).toContain('--outputFile.junit=reports/junit.xml');
    expect(ci).toMatch(/path: \|\n\s+reports\/\n\s+coverage\//);
    expect(ci).toContain('retention-days: 90');
  });

  it('[US-004:AC6][DEC-094] should judge apps/api coverage on unit and integration tests together', () => {
    const coverageConfig = read('vitest.coverage.config.ts');
    const unitConfig = read('vitest.config.ts');

    expect(scripts['test:ci']).toContain('--outputFile.blob=reports/blob/unit.json');
    expect(read('tools/run-e2e.mjs')).toContain("'--outputFile.blob=reports/blob/e2e.json'");
    expect(scripts['test:coverage']).toContain('--merge-reports=reports/blob');
    expect(scripts['test:coverage']).toContain('--config vitest.coverage.config.ts');
    expect(coverageConfig).toContain("'apps/api/src/**': { lines: 80 }");
    // The domain keeps its unit-only threshold; the API one moved, it did not disappear.
    expect(unitConfig).toContain("'packages/*/src/**': { lines: 90, branches: 90 }");
    expect(unitConfig).not.toContain("'apps/api/src/**': { lines");
    expect(runsOf('integration')).toEqual([
      'pnpm install --frozen-lockfile',
      'pnpm test:ci',
      'pnpm test:e2e',
      'pnpm test:coverage',
      'pnpm test:trace',
    ]);
  });

  it('[US-004:AC7][TC-083] should write a run manifest with commit, versions and seeds', () => {
    const r = spawnSync(process.execPath, ['tools/run-manifest.mjs', '--suite', 'unit=passed'], {
      cwd: root,
      encoding: 'utf8',
    });
    expect(r.status, r.stderr).toBe(0);

    const manifest = JSON.parse(read('reports/run-manifest.json'));
    expect(manifest.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(manifest.node).toBe(process.version);
    expect(manifest.fastCheck).toMatchObject({ seed: expect.any(Number), numRuns: expect.any(Number) });
    expect(manifest.images.postgres).toMatch(/^postgres:18/);
    expect(manifest.suites.unit).toBe('passed');
  });

  it('[US-004:AC9] should run the nightly suite every night with 5 000 runs and open a defect on failure', () => {
    expect(nightly).toMatch(/cron: '0 7 \* \* \*'/);
    expect(nightly).toContain('run: pnpm test:nightly');
    expect(nightly).toContain('if: failure()');
    expect(read('tools/nightly.mjs')).toContain("FC_NUM_RUNS ?? '5000'");
    expect(fastCheckParams({ FC_MODE: 'nightly', FC_NUM_RUNS: '5000', FC_SEED: '77' })).toEqual({
      mode: 'nightly',
      seed: 77,
      numRuns: 5000,
    });
    expect(fastCheckParams({})).toEqual({ mode: 'pr', seed: PR_SEED, numRuns: PR_RUNS });
  });

  it('[US-004:AC10] should generate the automatic sections of the test report', () => {
    const r = spawnSync(process.execPath, ['tools/test-report.mjs'], { cwd: root, encoding: 'utf8' });
    expect(r.status, r.stderr).toBe(0);

    const report = read('reports/test-summary.md');
    for (const section of [
      '## 1. Resumen',
      '## 2. Resultados',
      '## 3. Trazabilidad',
      '## 4. Cobertura',
      '## 5. Propiedades',
      '## 6. Benchmarks',
      '## 7. Mutación',
    ]) {
      expect(report).toContain(section);
    }
  });
});
