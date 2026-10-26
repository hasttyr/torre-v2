import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('..', import.meta.url));
const workspaces = ['apps', 'packages'].flatMap((dir) =>
  readdirSync(join(root, dir), { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(root, dir, e.name, 'tsconfig.json')))
    .map((e) => `${dir}/${e.name}`),
);
const tsconfig = (ws) => JSON.parse(readFileSync(join(root, ws, 'tsconfig.json'), 'utf8'));

describe('TypeScript configuration (US-002, ARCHITECTURE.md §3.1)', () => {
  it('[US-002:AC2] should make every workspace extend the shared strict base', () => {
    expect(workspaces.length).toBeGreaterThanOrEqual(10);
    for (const ws of workspaces) expect(tsconfig(ws).extends, ws).toBe('@torre/config/tsconfig.base.json');
  });

  it('[US-002:AC2] should enable decorators in apps/api only', () => {
    const withDecorators = workspaces.filter((ws) => tsconfig(ws).compilerOptions?.experimentalDecorators === true);

    expect(withDecorators).toEqual(['apps/api']);
  });

  it('[US-002:AC1] should keep the strict flags in the shared base', () => {
    const base = JSON.parse(readFileSync(join(root, 'packages/config/tsconfig.base.json'), 'utf8')).compilerOptions;

    for (const flag of [
      'strict',
      'noUncheckedIndexedAccess',
      'exactOptionalPropertyTypes',
      'noImplicitOverride',
      'noFallthroughCasesInSwitch',
      'noUnusedLocals',
      'noUnusedParameters',
      'verbatimModuleSyntax',
    ]) {
      expect(base[flag], flag).toBe(true);
    }
  });
});
