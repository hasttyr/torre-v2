import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { compareCompetitors, createPrng, shuffle } from '@torre/core';
import { arbScoring, arbTournament, loadGoldenCase } from '@torre/testing';
import type { GoldenCase } from '@torre/testing';
import gv001 from '../test/golden/gv-001.json' with { type: 'json' };
import gv007 from '../test/golden/gv-007.json' with { type: 'json' };
import { rankByPoints } from './ranking.js';
import { computeScores } from './scores.js';

const rankingOf = (golden: GoldenCase) => {
  const table = computeScores(golden.history, { scoring: golden.scoring!, gamesPerPairing: 1 }, golden.competitors);
  if (!table.ok) throw new Error(`golden ${golden.id} is inconsistent`);
  return rankByPoints(table.value).map((r) => r.id);
};

describe('rankByPoints', () => {
  it('[US-012:AC4][INV-S-2][TC-007] should give a total order by points, then seed, then id', () => {
    fc.assert(
      fc.property(arbTournament(), arbScoring(), ({ competitors, history }, scoring) => {
        const table = computeScores(history, { scoring, gamesPerPairing: 1 }, competitors);
        if (!table.ok) throw new Error('arbTournament produced an inconsistent history');
        const ranked = rankByPoints(table.value);

        expect(ranked.map((r) => r.position)).toEqual(competitors.map((_, i) => i + 1));
        for (let i = 1; i < ranked.length; i += 1) {
          const [above, below] = [ranked[i - 1]!, ranked[i]!];
          expect(
            above.points > below.points || (above.points === below.points && compareCompetitors(above, below) < 0),
          ).toBe(true);
        }
      }),
    );
  });

  it('[US-012:AC4][INV-S-2][TC-007] should rank the same way whatever the order of the input', () => {
    fc.assert(
      fc.property(arbTournament(), arbScoring(), fc.nat(), ({ competitors, history }, scoring, seed) => {
        const rules = { scoring, gamesPerPairing: 1 as const };
        const table = computeScores(history, rules, competitors);
        if (!table.ok) throw new Error('arbTournament produced an inconsistent history');
        const reversed = { ...table.value, rows: shuffle(table.value.rows, createPrng(seed)) };

        expect(rankByPoints(reversed)).toEqual(rankByPoints(table.value));
      }),
    );
  });

  it('[US-012:AC4] should rank GV-001 as A, C, B, D', () => {
    const golden = loadGoldenCase(gv001);

    expect(rankingOf(golden)).toEqual(golden.expected['ranking']);
  });

  it('[US-012:AC4] should break the GV-007 tie between P1 and P6 by seed', () => {
    const golden = loadGoldenCase(gv007);

    expect(rankingOf(golden)).toEqual(golden.expected['ranking']);
  });
});
