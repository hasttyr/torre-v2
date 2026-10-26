import { DomainError, err, halfPoints, ok, sortCompetitors } from '@torre/core';
import type {
  ByeKind,
  Competitor,
  CompetitorId,
  CompletedRoundsHistory,
  GameResult,
  HalfPoints,
  Result,
  Round,
  Side,
} from '@torre/core';
import type { RuleSet } from '@torre/rules';
import { pointsFor, pointsForBye } from './points.js';

/** A game that has no result yet: it does not count and is reported (US-012:AC3). */
export interface PendingGame {
  readonly round: number;
  readonly board: number;
  readonly white: CompetitorId;
  readonly black: CompetitorId;
}

export interface CompetitorScore {
  readonly id: CompetitorId;
  readonly seed: number;
  readonly status: Competitor['status'];
  readonly points: HalfPoints;
  /** Games of this competitor still without a result. */
  readonly pendingGames: number;
}

export interface ScoreTable {
  /** One row per competitor in seed order (BR-REG-04), whatever the order of the input. */
  readonly rows: readonly CompetitorScore[];
  /** Ordered by round and board. */
  readonly pending: readonly PendingGame[];
}

export const INCONSISTENT_HISTORY_REASONS = [
  'DUPLICATE_COMPETITOR',
  'UNKNOWN_COMPETITOR',
  'ROUND_OUT_OF_ORDER',
  'PLAYS_ITSELF',
  'TOO_MANY_ENTRIES',
  'GAME_AND_BYE',
  'DIFFERENT_OPPONENTS',
  'SAME_COLOUR_TWICE',
] as const;
export type InconsistentHistoryReason = (typeof INCONSISTENT_HISTORY_REASONS)[number];
export type InconsistentHistory = DomainError<'INCONSISTENT_HISTORY'>;

/** The parts of the RuleSet that scoring reads. */
export type ScoringRules = Pick<RuleSet, 'scoring' | 'gamesPerPairing'>;

interface Tally {
  readonly competitor: Competitor;
  points: number;
  pendingGames: number;
}

type Appearance = { readonly kind: 'BYE' } | { readonly kind: 'GAME'; readonly opponent: Tally; readonly side: Side };

type ResolvedEntry =
  | { readonly kind: 'BYE'; readonly tally: Tally; readonly bye: ByeKind }
  | {
      readonly kind: 'GAME';
      readonly board: number;
      readonly white: Tally;
      readonly black: Tally;
      readonly result: GameResult;
    };

interface Issue {
  readonly reason: InconsistentHistoryReason;
  readonly competitor: CompetitorId;
}

const issue = (reason: InconsistentHistoryReason, competitor: CompetitorId): Result<never, Issue> =>
  err({ reason, competitor });

/**
 * Who a competitor may meet in one round (BR-SCORE-01): with one game per pairing, one entry; with two,
 * two games against the same opponent with the colours reversed. A bye never shares the round with a game.
 */
function appearanceIssue(appearances: readonly Appearance[], gamesPerPairing: 1 | 2): Issue['reason'] | undefined {
  if (appearances.length > gamesPerPairing) return 'TOO_MANY_ENTRIES';
  const [first, second] = appearances;
  if (first === undefined || second === undefined) return undefined;
  if (first.kind !== second.kind) return 'GAME_AND_BYE';
  if (first.kind === 'GAME' && second.kind === 'GAME') {
    if (first.opponent !== second.opponent) return 'DIFFERENT_OPPONENTS';
    if (first.side === second.side) return 'SAME_COLOUR_TWICE';
  }
  return undefined;
}

/** Links every entry of a round to the tallies it touches and checks the round is consistent. */
function resolveRound(
  round: Round,
  tallies: ReadonlyMap<CompetitorId, Tally>,
  gamesPerPairing: 1 | 2,
): Result<ResolvedEntry[], Issue> {
  const resolved: ResolvedEntry[] = [];
  const appearances = new Map<Tally, Appearance[]>();
  const appear = (tally: Tally, appearance: Appearance) => {
    const list = appearances.get(tally) ?? [];
    list.push(appearance);
    appearances.set(tally, list);
  };
  for (const entry of round.entries) {
    if (entry.kind === 'BYE') {
      const tally = tallies.get(entry.competitor);
      if (tally === undefined) return issue('UNKNOWN_COMPETITOR', entry.competitor);
      appear(tally, { kind: 'BYE' });
      resolved.push({ kind: 'BYE', tally, bye: entry.bye });
      continue;
    }
    const white = tallies.get(entry.white);
    if (white === undefined) return issue('UNKNOWN_COMPETITOR', entry.white);
    const black = tallies.get(entry.black);
    if (black === undefined) return issue('UNKNOWN_COMPETITOR', entry.black);
    if (white === black) return issue('PLAYS_ITSELF', entry.white);
    appear(white, { kind: 'GAME', opponent: black, side: 'WHITE' });
    appear(black, { kind: 'GAME', opponent: white, side: 'BLACK' });
    resolved.push({ kind: 'GAME', board: entry.board, white, black, result: entry.result });
  }
  for (const [tally, list] of appearances) {
    const reason = appearanceIssue(list, gamesPerPairing);
    if (reason !== undefined) return issue(reason, tally.competitor.id);
  }
  return ok(resolved);
}

const inconsistent = (
  reason: InconsistentHistoryReason,
  details: Record<string, unknown>,
): Result<never, InconsistentHistory> => err(new DomainError('INCONSISTENT_HISTORY', { reason, ...details }));

/**
 * Points of every competitor after the rounds of `history`, in half-points (US-012:AC1).
 *
 * Every value comes from `ruleSet.scoring` (BR-SCORE-02). Games without a result add nothing and are
 * listed in `pending` (US-012:AC3). A withdrawn competitor keeps the points of the rounds it played and
 * gets nothing for the rounds it is absent from (BR-WD-01). With two games per pairing each game scores
 * on its own (BR-SCORE-01, OQ-025). A history that contradicts itself is rejected, not repaired.
 */
export function computeScores(
  history: CompletedRoundsHistory,
  ruleSet: ScoringRules,
  competitors: readonly Competitor[],
): Result<ScoreTable, InconsistentHistory> {
  const tallies = new Map<CompetitorId, Tally>();
  for (const competitor of competitors) {
    if (tallies.has(competitor.id)) return inconsistent('DUPLICATE_COMPETITOR', { competitor: competitor.id });
    tallies.set(competitor.id, { competitor, points: 0, pendingGames: 0 });
  }
  const { scoring } = ruleSet;
  const pending: PendingGame[] = [];
  for (const [index, round] of history.entries()) {
    if (round.number !== index + 1)
      return inconsistent('ROUND_OUT_OF_ORDER', { round: round.number, expected: index + 1 });
    const resolved = resolveRound(round, tallies, ruleSet.gamesPerPairing);
    if (!resolved.ok)
      return inconsistent(resolved.error.reason, { round: round.number, competitor: resolved.error.competitor });
    for (const entry of resolved.value) {
      if (entry.kind === 'BYE') {
        entry.tally.points += pointsForBye(entry.bye, scoring);
        continue;
      }
      const white = pointsFor(entry.result, 'WHITE', scoring);
      const black = pointsFor(entry.result, 'BLACK', scoring);
      if (white.ok && black.ok) {
        entry.white.points += white.value;
        entry.black.points += black.value;
      } else {
        entry.white.pendingGames += 1;
        entry.black.pendingGames += 1;
        pending.push({
          round: round.number,
          board: entry.board,
          white: entry.white.competitor.id,
          black: entry.black.competitor.id,
        });
      }
    }
  }
  const rows = sortCompetitors(
    [...tallies.values()].map(({ competitor, points, pendingGames }) => ({
      id: competitor.id,
      seed: competitor.seed,
      status: competitor.status,
      points: halfPoints(points),
      pendingGames,
    })),
  );
  pending.sort((a, b) => a.round - b.round || a.board - b.board);
  return ok({ rows, pending });
}
