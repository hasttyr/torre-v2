import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { competitorId, createPrng, shuffle } from '@torre/core';
import type { ByeKind, CompletedRoundsHistory, GameResult } from '@torre/core';
import type { Scoring } from '@torre/rules';
import { arbScoring, arbTournament, aScoring, competitors, loadGoldenCase, round } from '@torre/testing';
import type { EntrySpec } from '@torre/testing';
import gv001 from '../test/golden/gv-001.json' with { type: 'json' };
import gv007 from '../test/golden/gv-007.json' with { type: 'json' };
import { computeScores } from './scores.js';
import type { ScoreTable } from './scores.js';

/** Oracle written from BR-SCORE-01..04 without the code under test: [white field, black field]. */
const GAME_FIELDS: Readonly<Record<GameResult, readonly [keyof Scoring, keyof Scoring] | undefined>> = {
  WHITE_WINS: ['win', 'loss'],
  BLACK_WINS: ['loss', 'win'],
  DRAW: ['draw', 'draw'],
  WHITE_WINS_BY_FORFEIT: ['forfeitWin', 'forfeitLoss'],
  BLACK_WINS_BY_FORFEIT: ['forfeitLoss', 'forfeitWin'],
  DOUBLE_FORFEIT: ['doubleForfeit', 'doubleForfeit'],
  PENDING: undefined,
};
const BYE_FIELD: Readonly<Record<ByeKind, keyof Scoring>> = {
  PAIRING_BYE: 'pairingBye',
  HALF_POINT_BYE: 'halfPointBye',
  ZERO_POINT_BYE: 'zeroPointBye',
};

/** What the RuleSet awards, entry by entry (INV-S-1). */
function oracle(
  history: CompletedRoundsHistory,
  scoring: Scoring,
): { total: number; byCompetitor: Map<string, number> } {
  const byCompetitor = new Map<string, number>();
  const add = (id: string, units: number) => byCompetitor.set(id, (byCompetitor.get(id) ?? 0) + units);
  let total = 0;
  for (const r of history) {
    for (const entry of r.entries) {
      if (entry.kind === 'BYE') {
        add(entry.competitor, scoring[BYE_FIELD[entry.bye]]);
        total += scoring[BYE_FIELD[entry.bye]];
        continue;
      }
      const fields = GAME_FIELDS[entry.result];
      if (fields === undefined) continue;
      add(entry.white, scoring[fields[0]]);
      add(entry.black, scoring[fields[1]]);
      total += scoring[fields[0]] + scoring[fields[1]];
    }
  }
  return { total, byCompetitor };
}

const scored = (table: ScoreTable) => Object.fromEntries(table.rows.map((r) => [r.id, r.points]));
const total = (table: ScoreTable) => table.rows.reduce((sum, r) => sum + r.points, 0);

const reasonOf = (result: ReturnType<typeof computeScores>): unknown =>
  result.ok ? undefined : result.error.details['reason'];

describe('computeScores', () => {
  it('[US-012:AC1][US-012:AC2][INV-S-1][TC-006] should hand out exactly what the RuleSet awards for every entry', () => {
    fc.assert(
      fc.property(arbTournament(), arbScoring(), ({ competitors: roster, history }, scoring) => {
        const result = computeScores(history, { scoring, gamesPerPairing: 1 }, roster);
        const expected = oracle(history, scoring);

        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(total(result.value)).toBe(expected.total);
        for (const row of result.value.rows) expect(row.points).toBe(expected.byCompetitor.get(row.id) ?? 0);
      }),
    );
  });

  it('[US-012:AC1][INV-S-1][BR-SCORE-01] should score each game of a double-game pairing on its own', () => {
    fc.assert(
      fc.property(arbTournament({ gamesPerPairing: 2 }), arbScoring(), ({ competitors: roster, history }, scoring) => {
        const result = computeScores(history, { scoring, gamesPerPairing: 2 }, roster);

        expect(result.ok && total(result.value)).toBe(oracle(history, scoring).total);
      }),
    );
    const roster = competitors(2);
    const history = [
      round(1, [
        { white: 'c001', black: 'c002', result: 'WHITE_WINS' },
        { white: 'c002', black: 'c001', result: 'BLACK_WINS' },
      ]),
    ];
    const result = computeScores(history, { scoring: aScoring().build(), gamesPerPairing: 2 }, roster);

    expect(result.ok && scored(result.value)).toEqual({ c001: 4, c002: 0 });
  });

  it('[US-012:AC2] should scale with the RuleSet values, so no point value is hard-coded', () => {
    fc.assert(
      fc.property(
        arbTournament(),
        arbScoring(),
        fc.integer({ min: 2, max: 5 }),
        ({ competitors: roster, history }, scoring, k) => {
          const scaled = Object.fromEntries(Object.entries(scoring).map(([key, v]) => [key, v * k])) as Scoring;
          const base = computeScores(history, { scoring, gamesPerPairing: 1 }, roster);
          const times = computeScores(history, { scoring: scaled, gamesPerPairing: 1 }, roster);

          expect(base.ok && times.ok).toBe(true);
          if (!base.ok || !times.ok) return;
          expect(times.value.rows.map((r) => r.points)).toEqual(base.value.rows.map((r) => r.points * k));
        },
      ),
    );
  });

  it('[US-012:AC3] should not count pending games and should report each one on both sides', () => {
    fc.assert(
      fc.property(arbTournament(), ({ competitors: roster, history }) => {
        const result = computeScores(history, { scoring: aScoring().build(), gamesPerPairing: 1 }, roster);
        const pendingEntries = history.flatMap((r) =>
          r.entries.filter((e) => e.kind === 'GAME' && e.result === 'PENDING').map(() => r.number),
        );

        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.value.pending.map((p) => p.round)).toEqual(pendingEntries);
        expect(result.value.rows.reduce((sum, r) => sum + r.pendingGames, 0)).toBe(2 * pendingEntries.length);
      }),
    );
  });

  it('[US-012:AC1][INV-S-2][TC-007] should not depend on the order of the roster or of the entries', () => {
    fc.assert(
      fc.property(arbTournament(), fc.nat(), ({ competitors: roster, history }, seed) => {
        const prng = createPrng(seed);
        const shuffled = history.map((r) => ({ ...r, entries: shuffle(r.entries, prng) }));
        const rules = { scoring: aScoring().build(), gamesPerPairing: 1 as const };

        expect(computeScores(shuffled, rules, shuffle(roster, prng))).toEqual(computeScores(history, rules, roster));
      }),
    );
  });

  it('[US-012:AC1][INV-S-1] should reproduce the points of GV-001', () => {
    const golden = loadGoldenCase(gv001);
    const result = computeScores(golden.history, { scoring: golden.scoring!, gamesPerPairing: 1 }, golden.competitors);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(scored(result.value)).toEqual(golden.expected['points']);
    expect(total(result.value)).toBe(golden.expected['totalAwarded']);
    expect(result.value.pending).toEqual(golden.expected['pending']);
  });

  it('[US-012:AC1][US-012:AC3][BR-SCORE-03][BR-SCORE-04][BR-WD-01] should reproduce GV-007 with byes, forfeits, a withdrawal and a pending game', () => {
    const golden = loadGoldenCase(gv007);
    const result = computeScores(golden.history, { scoring: golden.scoring!, gamesPerPairing: 1 }, golden.competitors);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(scored(result.value)).toEqual(golden.expected['points']);
    expect(Object.fromEntries(result.value.rows.map((r) => [r.id, r.pendingGames]))).toEqual(
      golden.expected['pendingGames'],
    );
    expect(total(result.value)).toBe(golden.expected['totalAwarded']);
    expect(result.value.pending).toEqual(golden.expected['pending']);
    expect(result.value.rows.find((r) => r.id === competitorId('P6'))).toMatchObject({
      status: 'WITHDRAWN',
      points: 2,
    });
  });

  it('[US-012:AC1] should reject a history that contradicts itself, naming the reason', () => {
    const roster = competitors(3);
    const single = { scoring: aScoring().build(), gamesPerPairing: 1 as const };
    const double = { scoring: aScoring().build(), gamesPerPairing: 2 as const };
    const one = (specs: EntrySpec[]) => [round(1, specs)];
    const cases: readonly [string, ReturnType<typeof computeScores>, string][] = [
      ['duplicate competitor', computeScores([], single, [...roster, ...competitors(1)]), 'DUPLICATE_COMPETITOR'],
      ['unknown bye', computeScores(one([{ bye: 'x', kind: 'PAIRING_BYE' }]), single, roster), 'UNKNOWN_COMPETITOR'],
      [
        'unknown white',
        computeScores(one([{ white: 'x', black: 'c001', result: 'DRAW' }]), single, roster),
        'UNKNOWN_COMPETITOR',
      ],
      [
        'unknown black',
        computeScores(one([{ white: 'c001', black: 'x', result: 'DRAW' }]), single, roster),
        'UNKNOWN_COMPETITOR',
      ],
      ['round out of order', computeScores([round(2, [])], single, roster), 'ROUND_OUT_OF_ORDER'],
      [
        'plays itself',
        computeScores(one([{ white: 'c001', black: 'c001', result: 'DRAW' }]), single, roster),
        'PLAYS_ITSELF',
      ],
      [
        'two games with one game per pairing',
        computeScores(
          one([
            { white: 'c001', black: 'c002', result: 'DRAW' },
            { white: 'c003', black: 'c001', result: 'DRAW' },
          ]),
          single,
          roster,
        ),
        'TOO_MANY_ENTRIES',
      ],
      [
        'game and bye in the same round',
        computeScores(
          one([
            { white: 'c001', black: 'c002', result: 'DRAW' },
            { bye: 'c001', kind: 'HALF_POINT_BYE' },
          ]),
          double,
          roster,
        ),
        'GAME_AND_BYE',
      ],
      [
        'two opponents in a double-game round',
        computeScores(
          one([
            { white: 'c001', black: 'c002', result: 'DRAW' },
            { white: 'c003', black: 'c001', result: 'DRAW' },
          ]),
          double,
          roster,
        ),
        'DIFFERENT_OPPONENTS',
      ],
      [
        'same colours twice in a double-game round',
        computeScores(
          one([
            { white: 'c001', black: 'c002', result: 'DRAW' },
            { white: 'c001', black: 'c002', result: 'DRAW' },
          ]),
          double,
          roster,
        ),
        'SAME_COLOUR_TWICE',
      ],
    ];
    for (const [label, result, reason] of cases) {
      expect(result.ok ? undefined : result.error.code, label).toBe('INCONSISTENT_HISTORY');
      expect(reasonOf(result), label).toBe(reason);
    }
  });
});
