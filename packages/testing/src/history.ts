import fc from 'fast-check';
import { competitorId, createPrng, GAME_RESULTS, pick, shuffle } from '@torre/core';
import type { ByeKind, Competitor, GameResult, Prng, Round, RoundEntry } from '@torre/core';

/** A game or a bye as tests and golden files write it: plain ids, boards numbered by `round`. */
export type EntrySpec =
  | { readonly white: string; readonly black: string; readonly result: GameResult }
  | { readonly bye: string; readonly kind: ByeKind };

/** `n` active competitors `c001`…, with seeds 1…n unless `seeds` gives them. */
export function competitors(n: number, seeds?: readonly number[]): Competitor[] {
  return Array.from({ length: n }, (_, i) => ({
    id: competitorId(`c${String(i + 1).padStart(3, '0')}`),
    seed: seeds?.[i] ?? i + 1,
    status: 'ACTIVE' as const,
  }));
}

/** A round from entry specs; games take boards 1, 2, … in the order written. */
export function round(number: number, specs: readonly EntrySpec[]): Round {
  let board = 0;
  const entries = specs.map((spec): RoundEntry => {
    if ('bye' in spec) return { kind: 'BYE', competitor: competitorId(spec.bye), bye: spec.kind };
    board += 1;
    return {
      kind: 'GAME',
      board,
      white: competitorId(spec.white),
      black: competitorId(spec.black),
      result: spec.result,
    };
  });
  return { number, entries };
}

/** What happens in one simulated round, before it is turned into entries. */
interface RoundPlan {
  /** Every competitor index, in the order they are paired. */
  readonly order: readonly number[];
  /** The first `absent` competitors of `order` do not take part (withdrawn, late or missing). */
  readonly absent: number;
  /** The next competitors take these requested byes. */
  readonly requested: readonly ByeKind[];
  /** Results used in turn, one per game. */
  readonly results: readonly GameResult[];
}

/** Splits a list into consecutive pairs and the odd one out, if any. */
function pairsOf<T>(items: readonly T[]): { pairs: [T, T][]; rest: T | undefined } {
  const pairs: [T, T][] = [];
  let waiting: T | undefined;
  for (const item of items) {
    if (waiting === undefined) {
      waiting = item;
    } else {
      pairs.push([waiting, item]);
      waiting = undefined;
    }
  }
  return { pairs, rest: waiting };
}

/**
 * Turns a plan into a round: consecutive competitors meet, an odd one out gets the pairing bye.
 * With two games per pairing the second one has the colours reversed (BR-SCORE-01). The pairing is
 * random on purpose: these histories feed scoring properties, not pairing rules.
 */
function buildRound(number: number, roster: readonly Competitor[], plan: RoundPlan, gamesPerPairing: 1 | 2): Round {
  const present = plan.order.slice(plan.absent).flatMap((i) => roster[i]?.id ?? []);
  const entries: RoundEntry[] = [];
  plan.requested.forEach((bye, i) => {
    const competitor = present[i];
    if (competitor !== undefined) entries.push({ kind: 'BYE', competitor, bye });
  });
  const { pairs, rest } = pairsOf(present.slice(plan.requested.length));
  let board = 0;
  for (const [a, b] of pairs) {
    for (let g = 0; g < gamesPerPairing; g += 1) {
      const result = plan.results[board % plan.results.length] ?? 'PENDING';
      board += 1;
      entries.push({ kind: 'GAME', board, white: g === 0 ? a : b, black: g === 0 ? b : a, result });
    }
  }
  if (rest !== undefined) entries.push({ kind: 'BYE', competitor: rest, bye: 'PAIRING_BYE' });
  return { number, entries };
}

export interface SimulatedTournament {
  readonly competitors: readonly Competitor[];
  readonly history: readonly Round[];
}

export interface TournamentArbOptions {
  readonly minCompetitors?: number;
  readonly maxCompetitors?: number;
  readonly maxRounds?: number;
  readonly gamesPerPairing?: 1 | 2;
}

const indices = (n: number): number[] => Array.from({ length: n }, (_, i) => i);
const REQUESTED_BYES: readonly ByeKind[] = ['HALF_POINT_BYE', 'ZERO_POINT_BYE'];

/** Random consistent histories with every result, byes, absences and pending games (TESTING.md §5). */
export function arbTournament(options: TournamentArbOptions = {}): fc.Arbitrary<SimulatedTournament> {
  const { minCompetitors = 1, maxCompetitors = 12, maxRounds = 9, gamesPerPairing = 1 } = options;
  return fc.integer({ min: minCompetitors, max: maxCompetitors }).chain((n) => {
    const plan = fc.record({
      order: fc.shuffledSubarray(indices(n), { minLength: n, maxLength: n }),
      absent: fc.integer({ min: 0, max: Math.min(2, n) }),
      requested: fc.array(fc.constantFrom(...REQUESTED_BYES), { maxLength: 2 }),
      results: fc.array(fc.constantFrom(...GAME_RESULTS), { minLength: 1, maxLength: n * gamesPerPairing }),
    });
    return fc
      .record({
        seeds: fc.shuffledSubarray(
          indices(n).map((i) => i + 1),
          { minLength: n, maxLength: n },
        ),
        plans: fc.array(plan, { maxLength: maxRounds }),
      })
      .map(({ seeds, plans }) => {
        const roster = competitors(n, seeds);
        return { competitors: roster, history: plans.map((p, i) => buildRound(i + 1, roster, p, gamesPerPairing)) };
      });
  });
}

export interface SimulationOptions {
  readonly competitors: number;
  readonly rounds: number;
  readonly seed: number;
  readonly gamesPerPairing?: 1 | 2;
}

const DECIDED_RESULTS = GAME_RESULTS.filter((r) => r !== 'PENDING');

function planWith(prng: Prng, n: number): RoundPlan {
  return {
    order: shuffle(indices(n), prng),
    absent: prng.nextInt(3),
    requested: prng.nextInt(10) === 0 ? ['HALF_POINT_BYE'] : [],
    results: Array.from({ length: n }, () => pick(DECIDED_RESULTS, prng)),
  };
}

/** A deterministic finished tournament for benchmarks (TC-060): same seed, same history. */
export function simulateTournament(options: SimulationOptions): SimulatedTournament {
  const prng = createPrng(options.seed);
  const roster = competitors(options.competitors);
  const history = Array.from({ length: options.rounds }, (_, i) =>
    buildRound(i + 1, roster, planWith(prng, roster.length), options.gamesPerPairing ?? 1),
  );
  return { competitors: roster, history };
}
