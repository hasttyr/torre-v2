import { describe, expect, it } from 'vitest';
import { competitorId } from '@torre/core';
import type { CompetitorId } from '@torre/core';
import { loadPairingTables } from '@torre/testing';
import fideTables from '../test/golden/fide-berger-tables.json' with { type: 'json' };
import gv003 from '../test/golden/gv-003.json' with { type: 'json' };
import { bergerTable, roundRobinSchedule } from './round-robin.js';
import type { RoundRobinOptions, ScheduledRound } from './round-robin.js';

const SIZES = Array.from({ length: 39 }, (_, i) => i + 2); // 2…40 (US-014:AC5)
const SINGLE: RoundRobinOptions = { cycles: 1, reverseLastTwoRoundsOfFirstCycle: false };
const DOUBLE: RoundRobinOptions = { cycles: 2, reverseLastTwoRoundsOfFirstCycle: false };
const DOUBLE_FIDE: RoundRobinOptions = { cycles: 2, reverseLastTwoRoundsOfFirstCycle: true };

/** Participant i + 1 is `p<i+1>`, so a Berger number reads straight from the id. */
const participants = (n: number): CompetitorId[] => Array.from({ length: n }, (_, i) => competitorId(`p${i + 1}`));
const numberOf = (id: CompetitorId): number => Number(id.slice(1));

const schedule = (n: number, options: RoundRobinOptions): readonly ScheduledRound[] => {
  const result = roundRobinSchedule(participants(n), options);
  if (!result.ok) throw new Error(`n = ${n} should be schedulable`);
  return result.value;
};

/** Each round as `[white, black]` Berger numbers, with the rest written as a game against n + 1. */
const asTable = (rounds: readonly ScheduledRound[], m: number): (readonly [number, number])[][] =>
  rounds.map((r) => {
    const games = r.games.map((g) => [numberOf(g.white), numberOf(g.black)] as const);
    if (r.resting === undefined) return games;
    const rest = r.number % 2 === 1 ? ([numberOf(r.resting), m] as const) : ([m, numberOf(r.resting)] as const);
    return [rest, ...games];
  });

const meetings = (rounds: readonly ScheduledRound[]): Map<string, number> => {
  const count = new Map<string, number>();
  for (const g of rounds.flatMap((r) => r.games)) {
    const key = [g.white, g.black].sort().join('|');
    count.set(key, (count.get(key) ?? 0) + 1);
  }
  return count;
};

const colours = (rounds: readonly ScheduledRound[], id: CompetitorId): ('W' | 'B')[] =>
  rounds.flatMap((r) =>
    r.games.flatMap((g) => (g.white === id ? ['W' as const] : g.black === id ? ['B' as const] : [])),
  );

describe('roundRobinSchedule', () => {
  it('[US-014:AC2][US-014:AC5][INV-RR-1][TC-012] should pair every couple exactly once for every n from 2 to 40', () => {
    for (const n of SIZES) {
      const rounds = schedule(n, SINGLE);
      const met = meetings(rounds);

      expect(rounds, `n = ${n}`).toHaveLength(n % 2 === 0 ? n - 1 : n);
      expect(met.size, `n = ${n}`).toBe((n * (n - 1)) / 2);
      expect(
        [...met.values()].every((times) => times === 1),
        `n = ${n}`,
      ).toBe(true);
    }
  });

  it('[US-014:AC2][INV-RR-2][TC-012] should keep whites and blacks within one of each other for every competitor', () => {
    for (const n of SIZES) {
      const rounds = schedule(n, SINGLE);
      for (const id of participants(n)) {
        const seq = colours(rounds, id);
        const whites = seq.filter((c) => c === 'W').length;

        expect(seq, `n = ${n}, ${id}`).toHaveLength(n - 1);
        expect(Math.abs(whites - (seq.length - whites)), `n = ${n}, ${id}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it('[US-014:AC1][US-014:AC2][INV-RR-3][TC-012] should give an explicit rest once per competitor when n is odd, and none when n is even', () => {
    for (const n of SIZES) {
      const rounds = schedule(n, SINGLE);
      const rests = rounds.flatMap((r) => (r.resting === undefined ? [] : [r.resting]));

      if (n % 2 === 0) {
        expect(rests, `n = ${n}`).toEqual([]);
      } else {
        expect([...rests].sort(), `n = ${n}`).toEqual([...participants(n)].sort());
        for (const r of rounds) expect(r.games.some((g) => g.white === r.resting || g.black === r.resting)).toBe(false);
      }
    }
  });

  it('[US-014:AC4][TC-012] should reproduce GV-003 exactly for n = 4', () => {
    const golden = loadPairingTables(gv003);

    expect(asTable(schedule(4, SINGLE), 4)).toEqual(golden.tables.get(4));
    expect(schedule(4, SINGLE).map((r) => r.games.map((g) => g.board))).toEqual([
      [1, 2],
      [1, 2],
      [1, 2],
    ]);
  });

  it('[US-014:AC1][INV-RR-4][TC-012][BR-RR-01] should match the official FIDE Berger tables round by round and colour by colour for 3 to 16 players', () => {
    const golden = loadPairingTables(fideTables);

    expect([...golden.tables.keys()]).toEqual([4, 6, 8, 10, 12, 14, 16]);
    for (const [m, table] of golden.tables) {
      expect(bergerTable(m), `table ${m}`).toEqual(table);
      expect(asTable(schedule(m, SINGLE), m), `${m} players`).toEqual(table);
      // Odd number of players: the highest number of the table counts as the rest (SRC-14).
      expect(asTable(schedule(m - 1, SINGLE), m), `${m - 1} players`).toEqual(table);
    }
  });

  it('[US-014:AC3][INV-RR-1][BR-RR-02] should repeat the table with the colours reversed in the second cycle', () => {
    for (const n of SIZES) {
      const single = schedule(n, SINGLE);
      const double = schedule(n, DOUBLE);
      const second = double.slice(single.length);

      expect(double, `n = ${n}`).toHaveLength(2 * single.length);
      expect(second.map((r) => r.cycle).every((c) => c === 2)).toBe(true);
      expect(
        second.map((r) => r.games.map((g) => [g.black, g.white])),
        `n = ${n}`,
      ).toEqual(single.map((r) => r.games.map((g) => [g.white, g.black])));
      expect(
        [...meetings(double).values()].every((times) => times === 2),
        `n = ${n}`,
      ).toBe(true);
      for (const id of participants(n)) {
        const seq = colours(double, id);
        expect(seq.filter((c) => c === 'W').length, `n = ${n}, ${id}`).toBe(n - 1);
      }
    }
  });

  it('[US-014:AC3][BR-RR-02] should swap the last two rounds of the first cycle when the RuleSet asks for it', () => {
    for (const n of SIZES.filter((size) => size >= 3)) {
      const plain = schedule(n, DOUBLE);
      const fide = schedule(n, DOUBLE_FIDE);
      const length = plain.length / 2;
      const games = (r: ScheduledRound | undefined) => r?.games;

      expect(fide.slice(0, length - 2).map(games), `n = ${n}`).toEqual(plain.slice(0, length - 2).map(games));
      expect(games(fide[length - 2]), `n = ${n}`).toEqual(games(plain[length - 1]));
      expect(games(fide[length - 1]), `n = ${n}`).toEqual(games(plain[length - 2]));
      expect(fide.slice(length).map(games), `n = ${n}`).toEqual(plain.slice(length).map(games));
      expect(fide.map((r) => r.number)).toEqual(plain.map((r) => r.number));
    }
    // Two players have a single round per cycle: there is nothing to swap.
    expect(schedule(2, DOUBLE_FIDE)).toEqual(schedule(2, DOUBLE));
  });

  it('[US-014:AC5] should reject fewer than two participants or a repeated one', () => {
    const tooFew = roundRobinSchedule(participants(1), SINGLE);
    const repeated = roundRobinSchedule([competitorId('p1'), competitorId('p1')], SINGLE);

    expect(tooFew.ok ? undefined : tooFew.error.details).toEqual({ reason: 'TOO_FEW', count: 1 });
    expect(repeated.ok ? undefined : repeated.error.details).toEqual({ reason: 'DUPLICATE' });
  });
});

describe('bergerTable', () => {
  it('[BR-RR-01] should only accept an even number of players', () => {
    for (const m of [0, 1, 3, 2.5]) expect(() => bergerTable(m)).toThrow(RangeError);
  });
});
