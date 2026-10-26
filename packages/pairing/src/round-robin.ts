import { DomainError, err, ok } from '@torre/core';
import type { CompetitorId, Result } from '@torre/core';

/** A pair of Berger numbers (1-based); the first one has white. */
export type BergerPair = readonly [white: number, black: number];

/**
 * FIDE Berger table for an even number of players `m` (BR-RR-01), with the algorithm transcribed in
 * SOURCES.md §5.2 from SRC-14: rounds r = 0…m−2, positions k = 0…m−2, the player at position k is
 * ((k + r·m/2) mod (m−1)) + 1. Board 1 is position 0 against m, who has black in even rounds (counting
 * from 0) and white in odd ones; board k + 1 is position k (white) against position m−1−k.
 */
export function bergerTable(m: number): BergerPair[][] {
  if (!Number.isSafeInteger(m) || m < 2 || m % 2 !== 0) {
    throw new RangeError(`a Berger table needs an even number of players ≥ 2, got ${m}`);
  }
  const at = (r: number, k: number): number => ((k + (r * m) / 2) % (m - 1)) + 1;
  return Array.from({ length: m - 1 }, (_, r) => {
    const first: BergerPair = r % 2 === 0 ? [at(r, 0), m] : [m, at(r, 0)];
    const rest = Array.from({ length: m / 2 - 1 }, (_, i): BergerPair => [at(r, i + 1), at(r, m - 2 - i)]);
    return [first, ...rest];
  });
}

export interface ScheduledGame {
  readonly board: number;
  readonly white: CompetitorId;
  readonly black: CompetitorId;
}

export interface ScheduledRound {
  readonly number: number;
  readonly cycle: 1 | 2;
  /** Boards are numbered 1, 2, … in the order of the FIDE table, skipping the rest. */
  readonly games: readonly ScheduledGame[];
  /** With an odd number of participants, the one paired with the extra number does not play (BR-RR-01). */
  readonly resting?: CompetitorId;
}

export interface RoundRobinOptions {
  /** 2 = double round robin: the second cycle repeats the table with the colours reversed (BR-RR-02). */
  readonly cycles: 1 | 2;
  /** FIDE's recommendation for double round robins (SRC-14): swap the last two rounds of the first cycle. */
  readonly reverseLastTwoRoundsOfFirstCycle: boolean;
}

export type InvalidParticipants = DomainError<'INVALID_PARTICIPANTS'>;

/**
 * Full round-robin schedule (US-014). `participants[i]` takes Berger number i + 1: who gets which
 * number (lots or seed) is decided by the caller (OQ-034). With an odd number of participants the
 * highest number is the rest, as in the FIDE tables (SRC-14).
 */
export function roundRobinSchedule(
  participants: readonly CompetitorId[],
  options: RoundRobinOptions,
): Result<readonly ScheduledRound[], InvalidParticipants> {
  if (participants.length < 2) {
    return err(new DomainError('INVALID_PARTICIPANTS', { reason: 'TOO_FEW', count: participants.length }));
  }
  if (new Set(participants).size !== participants.length) {
    return err(new DomainError('INVALID_PARTICIPANTS', { reason: 'DUPLICATE' }));
  }
  const m = participants.length % 2 === 0 ? participants.length : participants.length + 1;
  const table = bergerTable(m);
  const firstCycle =
    options.cycles === 2 && options.reverseLastTwoRoundsOfFirstCycle && table.length >= 2
      ? [...table.slice(0, -2), ...table.slice(-2).reverse()]
      : table;
  const cycles =
    options.cycles === 2 ? [firstCycle, table.map((pairs) => pairs.map(([w, b]): BergerPair => [b, w]))] : [firstCycle];

  const rounds: ScheduledRound[] = [];
  cycles.forEach((cycleRounds, c) => {
    for (const pairs of cycleRounds) {
      const games: ScheduledGame[] = [];
      let resting: CompetitorId | undefined;
      for (const [w, b] of pairs) {
        const white = participants[w - 1];
        const black = participants[b - 1];
        if (white === undefined) resting = black;
        else if (black === undefined) resting = white;
        else games.push({ board: games.length + 1, white, black });
      }
      const round = { number: rounds.length + 1, cycle: c === 0 ? (1 as const) : (2 as const), games };
      rounds.push(resting === undefined ? round : { ...round, resting });
    }
  });
  return ok(rounds);
}
