import { ESLint } from 'eslint';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('..', import.meta.url));
const fixture = (name) => `tools/fixtures/lint/packages/core/src/${name}`;

let eslint;
beforeAll(() => {
  // The fixtures are ignored by the repository config; lint them on purpose here.
  eslint = new ESLint({ cwd: root, ignore: false });
});

async function rulesHit(name) {
  const [result] = await eslint.lintFiles([fixture(name)]);
  return result.messages.map((m) => m.ruleId ?? `fatal: ${m.message}`);
}

describe('shared ESLint config (US-002, ARCHITECTURE.md §3.1)', () => {
  it.each([
    ['explicit-any.ts', '@typescript-eslint/no-explicit-any'],
    ['node-io.ts', 'no-restricted-imports'],
    ['floating-promise.ts', '@typescript-eslint/no-floating-promises'],
    ['non-exhaustive-switch.ts', '@typescript-eslint/switch-exhaustiveness-check'],
    ['non-null.ts', '@typescript-eslint/no-non-null-assertion'],
    ['type-import.ts', '@typescript-eslint/consistent-type-imports'],
  ])('[US-002:AC3][US-002:AC4] should reject %s with %s', async (file, rule) => {
    expect(await rulesHit(file)).toContain(rule);
  });

  it('[US-002:AC3] should reject the clock, randomness and the environment in a domain package', async () => {
    const rules = await rulesHit('impure.ts');

    expect(rules.filter((r) => r === 'no-restricted-syntax')).toHaveLength(3);
    expect(rules).toContain('no-restricted-globals');
  });

  it('[US-002:AC3] should accept an explicit date in the domain', async () => {
    expect(await rulesHit('clean.ts')).toEqual([]);
  });

  it('[US-002:AC3] should allow `!`, the clock and randomness in test files', async () => {
    expect(await rulesHit('allowed.spec.ts')).toEqual([]);
  });
});
