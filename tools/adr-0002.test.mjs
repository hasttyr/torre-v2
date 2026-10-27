import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const adr = readFileSync(new URL('../docs/adr/ADR-0002-orpc-contracts.md', import.meta.url), 'utf8');
const section = (title) => adr.slice(adr.indexOf(`## ${title}`), adr.indexOf('\n## ', adr.indexOf(`## ${title}`) + 3));

describe('ADR-0002 (US-008)', () => {
  it('[US-008:AC3] should record a result for every point of the oRPC checklist and the decision taken', () => {
    const rows = section('Resultado por punto')
      .split('\n')
      .filter((line) => line.startsWith('| ') && !line.startsWith('| Punto') && !line.startsWith('|---'));
    const decision = section('Decisión');

    // The ten points of US-008:AC2, each with a verdict: passed, or moved to a named story.
    expect(rows).toHaveLength(10);
    for (const row of rows) expect(row).toMatch(/\| (✅|⏳ en `US-\d{3}`|❌) \|/);
    // Nothing failed, so the fallback of AC3 (nestjs-zod, DEC-020) is named but not taken.
    expect(rows.some((row) => row.includes('| ❌ |'))).toBe(false);
    expect(decision).toMatch(/Se confirma `DEC-060`/);
    expect(decision).toMatch(/`DEC-020` queda como alternativa no usada/);
  });
});
