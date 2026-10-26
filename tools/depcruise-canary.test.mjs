import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('..', import.meta.url));
const bin = fileURLToPath(new URL('../node_modules/dependency-cruiser/bin/dependency-cruiser.mjs', import.meta.url));

function cruise(target) {
  return spawnSync(process.execPath, [bin, target, '--config', '.dependency-cruiser.cjs', '--output-type', 'err'], {
    cwd: root,
    encoding: 'utf8',
  });
}

describe('dependency rules (ARCHITECTURE.md §5)', () => {
  it('[US-001:AC6][TC-063] should reject a domain package that imports a framework, a Node built-in or a higher layer', () => {
    const result = cruise('tools/fixtures/depcruise-canary');
    const output = `${result.stdout}${result.stderr}`;

    expect(result.status).not.toBe(0);
    expect(output).toContain('domain-no-framework');
    expect(output).toContain('domain-no-node-io');
    expect(output).toContain('layering-core');
  });

  it('[US-001:AC6] should accept the real workspace packages', () => {
    const result = cruise('packages');

    expect(result.status, `${result.stdout}${result.stderr}`).toBe(0);
  });
});
