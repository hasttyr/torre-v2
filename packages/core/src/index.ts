// Public API of @torre/core: base types shared by every domain package (US-011).
export { DomainError, err, ok } from './result.js';
export type { Result } from './result.js';

export { competitorId, gameId, institutionId, organizationId, playerId, teamId, tournamentId } from './ids.js';
export type {
  Brand,
  CompetitorId,
  GameId,
  InstitutionId,
  OrganizationId,
  PlayerId,
  TeamId,
  TournamentId,
} from './ids.js';

export { BYE_KINDS, GAME_RESULTS, isDecided, opponentOf, SIDES } from './model.js';
export type {
  ByeKind,
  Competitor,
  CompletedRoundsHistory,
  GameResult,
  Pairing,
  Round,
  RoundEntry,
  RoundView,
  Side,
} from './model.js';

export { formatUnits, HALF_POINT_DIVISOR, halfPoints, parseUnits, QUARTER_POINT_DIVISOR } from './units.js';
export type { FormatOptions, HalfPoints } from './units.js';

export { compareCompetitors, sortCompetitors } from './ordering.js';
