import { compareCompetitors } from '@torre/core';
import type { CompetitorScore, ScoreTable } from './scores.js';

export interface RankedScore extends CompetitorScore {
  /** 1 for the first; every position is distinct because the order is total. */
  readonly position: number;
}

/**
 * Base standings (US-012:AC4): points first, then seed and id so the order is total and the same on
 * every machine (INV-S-2). The tie-breaks of the RuleSet replace the seed step in US-013.
 */
export function rankByPoints(table: ScoreTable): readonly RankedScore[] {
  return [...table.rows]
    .sort((a, b) => b.points - a.points || compareCompetitors(a, b))
    .map((row, i) => ({ ...row, position: i + 1 }));
}
