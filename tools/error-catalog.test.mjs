import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ERROR_CATALOG } from '../packages/contracts/src/errors.ts';

/** Code → HTTP status from the table of CONVENTIONS.md §6, the source of the catalog. */
function documentedCodes() {
  const text = readFileSync(fileURLToPath(new URL('../docs/CONVENTIONS.md', import.meta.url)), 'utf8');
  const start = text.indexOf('| Código | HTTP | Cuándo |');
  const table = text.slice(start, text.indexOf('- Errores de dominio:', start));
  return Object.fromEntries(
    table
      .split('\n')
      .filter((line) => line.startsWith('| `'))
      .map((line) => line.split('|').map((cell) => cell.trim()))
      .map(([, code, status]) => [code.replaceAll('`', ''), Number(status)]),
  );
}

describe('error catalog (US-006:AC3, CONVENTIONS.md §6)', () => {
  it('[US-006:AC3] should list exactly the documented codes with their HTTP status', () => {
    const catalog = Object.fromEntries(Object.entries(ERROR_CATALOG).map(([code, entry]) => [code, entry.status]));
    const documented = documentedCodes();

    expect(Object.keys(documented).length).toBeGreaterThan(30);
    expect(catalog).toEqual(documented);
  });

  it('[US-006:AC3] should use stable UPPER_SNAKE_CASE codes and a title for each', () => {
    for (const [code, entry] of Object.entries(ERROR_CATALOG)) {
      expect(code).toMatch(/^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$/);
      expect(entry.title.length, code).toBeGreaterThan(0);
    }
  });
});
