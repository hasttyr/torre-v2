import { describe, expect, it } from 'vitest';
import { DomainError, err, ok } from './result.js';
import { competitorId, tournamentId } from './ids.js';
import { BYE_KINDS, GAME_RESULTS, isDecided, opponentOf, SIDES } from './model.js';
import type { Round } from './model.js';

describe('core model (US-011)', () => {
  it('[US-011:AC1][BR-SCORE-01] should list every game outcome and bye of BR-SCORE-01', () => {
    expect(GAME_RESULTS).toEqual([
      'WHITE_WINS',
      'BLACK_WINS',
      'DRAW',
      'WHITE_WINS_BY_FORFEIT',
      'BLACK_WINS_BY_FORFEIT',
      'DOUBLE_FORFEIT',
      'PENDING',
    ]);
    expect(BYE_KINDS).toEqual(['PAIRING_BYE', 'HALF_POINT_BYE', 'ZERO_POINT_BYE']);
    expect(SIDES).toEqual(['WHITE', 'BLACK']);
    expect(isDecided('PENDING')).toBe(false);
    expect(isDecided('DOUBLE_FORFEIT')).toBe(true);
  });

  it('[US-011:AC1] should model a round as games and byes, and find each opponent', () => {
    const [a, b, c] = [competitorId('a'), competitorId('b'), competitorId('c')];
    const round: Round = {
      number: 1,
      entries: [
        { kind: 'GAME', board: 1, white: a, black: b, result: 'DRAW' },
        { kind: 'BYE', competitor: c, bye: 'PAIRING_BYE' },
      ],
    };

    expect(opponentOf(round, a)).toEqual({ kind: 'GAME', opponent: b, side: 'WHITE', result: 'DRAW' });
    expect(opponentOf(round, b)).toEqual({ kind: 'GAME', opponent: a, side: 'BLACK', result: 'DRAW' });
    expect(opponentOf(round, c)).toEqual({ kind: 'BYE', bye: 'PAIRING_BYE' });
    expect(opponentOf(round, competitorId('z'))).toBeUndefined();
  });

  it('[US-011:AC1] should carry expected errors as values, not exceptions', () => {
    const failure = err(new DomainError('NO_VALID_PAIRING', { round: 3 }));
    const success = ok(tournamentId('t-1'));

    expect(failure).toEqual({ ok: false, error: new DomainError('NO_VALID_PAIRING', { round: 3 }) });
    expect(failure.ok ? undefined : failure.error.code).toBe('NO_VALID_PAIRING');
    expect(success).toEqual({ ok: true, value: 't-1' });
  });

  it('[US-011:AC1] should reject empty identifiers', () => {
    expect(() => competitorId('')).toThrow(RangeError);
    expect(() => competitorId('   ')).toThrow(RangeError);
  });
});
