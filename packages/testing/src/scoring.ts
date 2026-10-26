import fc from 'fast-check';
import type { Scoring } from '@torre/rules';

/**
 * Laws of Chess values in half points (BR-NUM-01). Test data only: real tournaments take their values
 * from the presets of @torre/rules, where every value cites its source.
 */
const STANDARD_SCORING: Scoring = {
  win: 2,
  draw: 1,
  loss: 0,
  forfeitWin: 2,
  forfeitLoss: 0,
  doubleForfeit: 0,
  pairingBye: 2,
  halfPointBye: 1,
  zeroPointBye: 0,
};

export interface ScoringBuilder {
  with(overrides: Partial<Scoring>): ScoringBuilder;
  build(): Scoring;
}

/** Builder of `RuleSet.scoring` for tests (CONVENTIONS.md §2.1). */
export function aScoring(base: Scoring = STANDARD_SCORING): ScoringBuilder {
  return {
    with: (overrides) => aScoring({ ...base, ...overrides }),
    build: () => ({ ...base }),
  };
}

/**
 * Random coherent scorings (win ≥ draw ≥ loss, US-010:AC2). Every other value is independent, so a
 * property fails when code reads the wrong field or hard-codes a number (US-012:AC2).
 */
export function arbScoring(): fc.Arbitrary<Scoring> {
  const units = fc.integer({ min: 0, max: 40 });
  return fc
    .record({
      loss: fc.integer({ min: 0, max: 10 }),
      drawExtra: fc.integer({ min: 0, max: 10 }),
      winExtra: fc.integer({ min: 0, max: 10 }),
      forfeitWin: units,
      forfeitLoss: units,
      doubleForfeit: units,
      pairingBye: units,
      halfPointBye: units,
      zeroPointBye: units,
    })
    .map(({ loss, drawExtra, winExtra, ...rest }) => ({
      ...rest,
      loss,
      draw: loss + drawExtra,
      win: loss + drawExtra + winExtra,
    }));
}
