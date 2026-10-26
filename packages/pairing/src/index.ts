// Public API of @torre/pairing: round-robin schedules (US-014); the Swiss engine arrives with US-015.
export { bergerTable, roundRobinSchedule } from './round-robin.js';
export type {
  BergerPair,
  InvalidParticipants,
  RoundRobinOptions,
  ScheduledGame,
  ScheduledRound,
} from './round-robin.js';
