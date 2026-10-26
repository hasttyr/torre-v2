// Public API of @torre/standings: points and base standings (US-012); tie-breaks arrive with US-013.
export { pointsFor, pointsForBye } from './points.js';

export { computeScores, INCONSISTENT_HISTORY_REASONS } from './scores.js';
export type {
  CompetitorScore,
  InconsistentHistory,
  InconsistentHistoryReason,
  PendingGame,
  ScoreTable,
  ScoringRules,
} from './scores.js';

export { rankByPoints } from './ranking.js';
export type { RankedScore } from './ranking.js';
