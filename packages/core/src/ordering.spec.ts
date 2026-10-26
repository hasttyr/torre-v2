import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { competitorId } from './ids.js';
import type { Competitor } from './model.js';
import { compareCompetitors, sortCompetitors } from './ordering.js';

const competitorArb = fc.record({
  id: fc.string({ minLength: 1, maxLength: 8 }).map((s) => competitorId(`c-${s}`)),
  seed: fc.integer({ min: 1, max: 60 }),
  status: fc.constantFrom('ACTIVE' as const, 'WITHDRAWN' as const),
});
const competitorsArb = fc.uniqueArray(competitorArb, { selector: (c) => c.id, maxLength: 40 });

describe('canonical competitor order (BR-GEN-01)', () => {
  it('[US-011:AC3][TC-002][BR-GEN-01] should not depend on the input order', () => {
    fc.assert(
      fc.property(competitorsArb, fc.infiniteStream(fc.nat()), (competitors, noise) => {
        const shuffled = [...competitors].sort(() => (noise.next().value % 3) - 1);

        expect(sortCompetitors(shuffled)).toEqual(sortCompetitors(competitors));
      }),
    );
  });

  it('[US-011:AC3][TC-002][BR-GEN-01] should be a total order: by seed, then by id', () => {
    fc.assert(
      fc.property(competitorsArb, (competitors) => {
        const sorted = sortCompetitors(competitors);
        for (let i = 1; i < sorted.length; i++) {
          const [a, b] = [sorted[i - 1]!, sorted[i]!];
          expect(compareCompetitors(a, b)).toBeLessThan(0);
          expect(a.seed < b.seed || (a.seed === b.seed && a.id < b.id)).toBe(true);
        }
      }),
    );
  });

  it('[US-011:AC3] should treat the same competitor as equal to itself', () => {
    const c = { id: competitorId('a'), seed: 1 };

    expect(compareCompetitors(c, { ...c })).toBe(0);
  });

  it('[US-011:AC3][US-011:AC4] should return a new array and leave the input untouched', () => {
    const input: readonly Competitor[] = Object.freeze([
      { id: competitorId('b'), seed: 2, status: 'ACTIVE' },
      { id: competitorId('a'), seed: 1, status: 'ACTIVE' },
    ]);

    const sorted = sortCompetitors(input);

    expect(sorted).not.toBe(input);
    expect(sorted.map((c) => c.id)).toEqual(['a', 'b']);
    expect(input.map((c) => c.id)).toEqual(['b', 'a']);
  });
});
