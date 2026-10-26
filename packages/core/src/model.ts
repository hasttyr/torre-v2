import type { CompetitorId, InstitutionId } from './ids.js';

/** Outcomes of a game between two competitors (BR-SCORE-01). `PENDING` = no result yet. */
export const GAME_RESULTS = [
  'WHITE_WINS',
  'BLACK_WINS',
  'DRAW',
  'WHITE_WINS_BY_FORFEIT',
  'BLACK_WINS_BY_FORFEIT',
  'DOUBLE_FORFEIT',
  'PENDING',
] as const;
export type GameResult = (typeof GAME_RESULTS)[number];

/** Rounds without an opponent (BR-SCORE-01, BR-SCORE-04, BR-WD-03). */
export const BYE_KINDS = ['PAIRING_BYE', 'HALF_POINT_BYE', 'ZERO_POINT_BYE'] as const;
export type ByeKind = (typeof BYE_KINDS)[number];

export const SIDES = ['WHITE', 'BLACK'] as const;
export type Side = (typeof SIDES)[number];

export const isDecided = (result: GameResult): boolean => result !== 'PENDING';

/** A competitor as the pairing and standings engines see it (BR-PAIR-01, BR-TEAM-08). */
export interface Competitor {
  readonly id: CompetitorId;
  /** Initial rank (TPN): 1 is the strongest (BR-REG-04). */
  readonly seed: number;
  readonly rating?: number;
  readonly institutionId?: InstitutionId;
  readonly status: 'ACTIVE' | 'WITHDRAWN';
}

/** A pairing of one board in a round. */
export interface Pairing {
  readonly board: number;
  readonly white: CompetitorId;
  readonly black: CompetitorId;
}

export type RoundEntry =
  | {
      readonly kind: 'GAME';
      readonly board: number;
      readonly white: CompetitorId;
      readonly black: CompetitorId;
      readonly result: GameResult;
    }
  | { readonly kind: 'BYE'; readonly competitor: CompetitorId; readonly bye: ByeKind };

export interface Round {
  readonly number: number;
  readonly entries: readonly RoundEntry[];
}

/** Rounds already played, in order: who met whom, colours, byes and results (BR-PAIR-01). */
export type CompletedRoundsHistory = readonly Round[];

export type RoundView =
  | { readonly kind: 'GAME'; readonly opponent: CompetitorId; readonly side: Side; readonly result: GameResult }
  | { readonly kind: 'BYE'; readonly bye: ByeKind };

/** What a competitor did in a round, or `undefined` if it does not appear in it. */
export function opponentOf(round: Round, competitor: CompetitorId): RoundView | undefined {
  for (const entry of round.entries) {
    if (entry.kind === 'BYE') {
      if (entry.competitor === competitor) return { kind: 'BYE', bye: entry.bye };
    } else if (entry.white === competitor) {
      return { kind: 'GAME', opponent: entry.black, side: 'WHITE', result: entry.result };
    } else if (entry.black === competitor) {
      return { kind: 'GAME', opponent: entry.white, side: 'BLACK', result: entry.result };
    }
  }
  return undefined;
}
