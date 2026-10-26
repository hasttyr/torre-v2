import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('..', import.meta.url));
const fixtures = 'tools/fixtures/trace';
let dir;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'trace-'));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

/** Writes a Vitest-style JSON report with the given [title, status] pairs and runs test:trace on it. */
function traceWith(results) {
  const report = {
    success: true,
    testResults: [
      {
        name: join(root, 'tools/fake.test.mjs'),
        assertionResults: results.map(([title, status]) => ({ title, status })),
      },
    ],
  };
  writeFileSync(join(dir, 'results.json'), JSON.stringify(report));
  const out = join(dir, 'traceability.md');
  const r = spawnSync(
    process.execPath,
    [
      'tools/test-trace.mjs',
      '--stories',
      `${fixtures}/stories`,
      '--plan',
      `${fixtures}/plan.md`,
      '--results',
      join(dir, 'results.json'),
      '--out',
      out,
    ],
    { cwd: root, encoding: 'utf8' },
  );
  return { status: r.status, output: r.stdout + r.stderr, report: readFileSync(out, 'utf8') };
}

describe('test:trace (TEST-PLAN.md §6.2.1)', () => {
  it('[US-004:AC8] should fail when a DONE story has a criterion without a tagged test', () => {
    const result = traceWith([['[US-990:AC1][TC-990] first', 'passed']]);

    expect(result.status).toBe(1);
    expect(result.output).toContain('US-990 AC2: sin prueba etiquetada');
    expect(result.report).toContain('| US-990 | DONE | AC2 | — | ❌ sin prueba |');
  });

  it('[US-004:AC8] should fail when the only test of a criterion is red', () => {
    const result = traceWith([
      ['[US-990:AC1][TC-990] first', 'passed'],
      ['[US-990:AC2] second', 'failed'],
    ]);

    expect(result.status).toBe(1);
    expect(result.output).toContain('US-990 AC2: sus pruebas no están en verde');
  });

  it('[US-004:AC8] should fail when a priority-A case of DONE stories has no test', () => {
    const result = traceWith([
      ['[US-990:AC1] first', 'passed'],
      ['[US-990:AC2] second', 'passed'],
    ]);

    expect(result.status).toBe(1);
    expect(result.output).toContain('TC-990');
    expect(result.output).not.toContain('TC-991');
    expect(result.output).not.toContain('TC-992');
  });

  it('[US-004:AC8] should pass when every enforced criterion and case is green, without enforcing unfinished stories', () => {
    const result = traceWith([
      ['[US-990:AC1][TC-990] first', 'passed'],
      ['[US-990:AC2] second', 'passed'],
    ]);

    expect(result.status, result.output).toBe(0);
    expect(result.report).toContain('| US-991 | IN_PROGRESS | AC1 | — | ❌ sin prueba |');
  });
});
