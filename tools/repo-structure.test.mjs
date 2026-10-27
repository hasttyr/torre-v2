import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (path) => readFileSync(join(root, path), 'utf8');
const json = (path) => JSON.parse(read(path));
// TORRE_DRY_RUN: scripts with side effects (dev, test:e2e) only check their prerequisites and exit.
const run = (script, args = [], input) =>
  spawnSync(process.execPath, [join(root, script), ...args], {
    cwd: root,
    encoding: 'utf8',
    input,
    env: { ...process.env, TORRE_DRY_RUN: '1' },
  });

const PACKAGES = ['config', 'core', 'rules', 'standings', 'pairing', 'ratings', 'tournament', 'contracts', 'testing'];

describe('monorepo structure (US-001)', () => {
  it('[US-001:AC1] should pin pnpm and commit the lockfile that CI installs frozen', () => {
    expect(json('package.json').packageManager).toMatch(/^pnpm@\d+\.\d+\.\d+$/);
    expect(existsSync(join(root, 'pnpm-lock.yaml'))).toBe(true);
    expect(read('.github/workflows/ci.yml')).toContain('pnpm install --frozen-lockfile');
  });

  it('[US-001:AC2] should contain the apps and the @torre packages as ESM workspaces', () => {
    for (const app of ['api', 'web'])
      expect(json(`apps/${app}/package.json`)).toMatchObject({ name: `@torre/${app}`, type: 'module' });
    for (const pkg of PACKAGES) {
      expect(json(`packages/${pkg}/package.json`), pkg).toMatchObject({ name: `@torre/${pkg}`, type: 'module' });
    }
    expect(json('apps/api/tsconfig.json').compilerOptions.module ?? 'NodeNext').toBe('NodeNext');
    expect(json('apps/web/tsconfig.json').compilerOptions.moduleResolution).toBe('Bundler');
  });

  it('[US-001:AC3] should expose the root scripts, with the not-yet-available ones succeeding', () => {
    const scripts = json('package.json').scripts;
    for (const name of [
      'lint',
      'typecheck',
      'test',
      'test:e2e',
      'build',
      'dev',
      'verify:fast',
      'check:floor',
      'verify',
      'verify:full',
    ]) {
      expect(scripts[name], name).toBeTruthy();
    }
    expect(run('tools/run-e2e.mjs').status).toBe(0);
    expect(run('tools/dev.mjs').status).toBe(0);
  });

  it('[US-001:AC4] should pin the Node LTS and keep editor and git settings', () => {
    expect(read('.nvmrc').trim()).toBe('24');
    expect(json('package.json').engines.node).toMatch(/^>=24\./);
    for (const file of ['.editorconfig', '.gitignore', '.gitattributes'])
      expect(existsSync(join(root, file)), file).toBe(true);
    expect(read('.gitignore')).toMatch(/^\.env$/m);
  });

  it('[US-001:AC5] should run lint-staged before commits and reject messages that are not Conventional Commits', () => {
    expect(read('.husky/pre-commit')).toContain('lint-staged');
    expect(read('.husky/commit-msg')).toContain('commitlint');

    const commitlint = 'node_modules/@commitlint/cli/cli.js';
    expect(run(commitlint, [], 'updated some stuff').status).not.toBe(0);
    expect(run(commitlint, [], 'feat(core): add the result type').status).toBe(0);
  });

  it('[US-001:AC7] should record the verified stack in ADR-0001', () => {
    const adr = read('docs/adr/ADR-0001-stack-and-versions.md');

    for (const fact of ['Node 24', 'TypeScript 6.0.3', '@nestjs/core', 'prisma', 'SecLists', 'MIT'])
      expect(adr, fact).toContain(fact);
    expect(adr).toContain('emitDecoratorMetadata');
  });
});

describe('shared configuration (US-002)', () => {
  it('[US-002:AC5] should pass lint and typecheck across the whole repository', () => {
    const lint = run('node_modules/eslint/bin/eslint.js', ['.', '--max-warnings=0']);
    expect(lint.status, lint.stdout + lint.stderr).toBe(0);

    for (const ws of ['apps/api', 'apps/web', ...PACKAGES.filter((p) => p !== 'config').map((p) => `packages/${p}`)]) {
      const tsc = run('node_modules/typescript/bin/tsc', ['-p', `${ws}/tsconfig.json`, '--noEmit']);
      expect(tsc.status, `${ws}: ${tsc.stdout}`).toBe(0);
    }
  });
});
