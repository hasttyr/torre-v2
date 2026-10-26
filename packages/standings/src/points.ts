import { DomainError, err, halfPoints, ok } from '@torre/core';
import type { ByeKind, GameResult, HalfPoints, Result, Side } from '@torre/core';
import type { Scoring } from '@torre/rules';

/**
 * Points one side earns for one game, in half-points (BR-NUM-01).
 * Every value comes from the RuleSet (BR-SCORE-02): no magic numbers.
 *
 * @example pointsFor('DRAW', 'BLACK', scoring) // ok(scoring.draw)
 */
export function pointsFor(
  result: GameResult,
  side: Side,
  scoring: Readonly<Scoring>,
): Result<HalfPoints, DomainError<'RESULT_PENDING'>> {
  const isWhite = side === 'WHITE';
  switch (result) {
    case 'WHITE_WINS':
      return ok(halfPoints(isWhite ? scoring.win : scoring.loss));
    case 'BLACK_WINS':
      return ok(halfPoints(isWhite ? scoring.loss : scoring.win));
    case 'DRAW':
      return ok(halfPoints(scoring.draw));
    case 'WHITE_WINS_BY_FORFEIT':
      return ok(halfPoints(isWhite ? scoring.forfeitWin : scoring.forfeitLoss));
    case 'BLACK_WINS_BY_FORFEIT':
      return ok(halfPoints(isWhite ? scoring.forfeitLoss : scoring.forfeitWin));
    case 'DOUBLE_FORFEIT':
      return ok(halfPoints(scoring.doubleForfeit));
    case 'PENDING':
      // A pending game is an expected state, not a bug: return it, do not throw (US-012:AC3).
      return err(new DomainError('RESULT_PENDING', { result }));
    default: {
      const unreachable: never = result;
      return unreachable;
    }
  }
}

/** Points of a round without an opponent (BR-SCORE-01, BR-SCORE-04, BR-WD-03), from the RuleSet. */
export function pointsForBye(bye: ByeKind, scoring: Readonly<Scoring>): HalfPoints {
  switch (bye) {
    case 'PAIRING_BYE':
      return halfPoints(scoring.pairingBye);
    case 'HALF_POINT_BYE':
      return halfPoints(scoring.halfPointBye);
    case 'ZERO_POINT_BYE':
      return halfPoints(scoring.zeroPointBye);
    default: {
      const unreachable: never = bye;
      return unreachable;
    }
  }
}
