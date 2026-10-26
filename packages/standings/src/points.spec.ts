import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { BYE_KINDS, GAME_RESULTS } from '@torre/core';
import type { GameResult, Side } from '@torre/core';
import { aScoring, arbScoring } from '@torre/testing';
import type { Scoring } from '@torre/rules';
import { pointsFor, pointsForBye } from './points.js';

const DECIDED = GAME_RESULTS.filter((r) => r !== 'PENDING');

/** Which scoring field each side earns, written out by hand from BR-SCORE-01..03. */
const EXPECTED_FIELD: Readonly<Record<Exclude<GameResult, 'PENDING'>, Record<Side, keyof Scoring>>> = {
  WHITE_WINS: { WHITE: 'win', BLACK: 'loss' },
  BLACK_WINS: { WHITE: 'loss', BLACK: 'win' },
  DRAW: { WHITE: 'draw', BLACK: 'draw' },
  WHITE_WINS_BY_FORFEIT: { WHITE: 'forfeitWin', BLACK: 'forfeitLoss' },
  BLACK_WINS_BY_FORFEIT: { WHITE: 'forfeitLoss', BLACK: 'forfeitWin' },
  DOUBLE_FORFEIT: { WHITE: 'doubleForfeit', BLACK: 'doubleForfeit' },
};

describe('pointsFor', () => {
  it('[US-012:AC2][BR-SCORE-02] should take the winner and loser points from the RuleSet when white wins', () => {
    const scoring = aScoring().build();

    expect(pointsFor('WHITE_WINS', 'WHITE', scoring)).toEqual({ ok: true, value: scoring.win });
    expect(pointsFor('WHITE_WINS', 'BLACK', scoring)).toEqual({ ok: true, value: scoring.loss });
  });

  it('[US-012:AC1][US-012:AC2][BR-SCORE-01][BR-SCORE-03] should read the right RuleSet field for every result and side', () => {
    fc.assert(
      fc.property(
        arbScoring(),
        fc.constantFrom(...DECIDED),
        fc.constantFrom<Side>('WHITE', 'BLACK'),
        (scoring, result, side) => {
          expect(pointsFor(result, side, scoring)).toEqual({ ok: true, value: scoring[EXPECTED_FIELD[result][side]] });
        },
      ),
    );
  });

  it('[US-012:AC3] should report RESULT_PENDING when the game has no result yet', () => {
    const outcome = pointsFor('PENDING', 'WHITE', aScoring().build());

    expect(outcome.ok ? undefined : outcome.error.code).toBe('RESULT_PENDING');
  });

  it('[US-012:AC1][INV-S-1][TC-006] should hand out win + loss or two draws for every decided game', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('WHITE_WINS' as const, 'BLACK_WINS' as const, 'DRAW' as const),
        arbScoring(),
        (result, scoring) => {
          const white = pointsFor(result, 'WHITE', scoring);
          const black = pointsFor(result, 'BLACK', scoring);
          const expected = result === 'DRAW' ? 2 * scoring.draw : scoring.win + scoring.loss;

          expect(white.ok && black.ok && white.value + black.value).toBe(expected);
        },
      ),
    );
  });
});

describe('pointsForBye', () => {
  it('[US-012:AC1][US-012:AC2][BR-SCORE-04][BR-WD-03] should give each bye the points the RuleSet sets for it', () => {
    const field = {
      PAIRING_BYE: 'pairingBye',
      HALF_POINT_BYE: 'halfPointBye',
      ZERO_POINT_BYE: 'zeroPointBye',
    } as const;
    fc.assert(
      fc.property(arbScoring(), fc.constantFrom(...BYE_KINDS), (scoring, bye) => {
        expect(pointsForBye(bye, scoring)).toBe(scoring[field[bye]]);
      }),
    );
  });
});
