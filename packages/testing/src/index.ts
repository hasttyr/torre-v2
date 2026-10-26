// Public API of @torre/testing: builders, simulators, golden files and benchmark helpers (development only).
export { aScoring, arbScoring } from './scoring.js';
export type { ScoringBuilder } from './scoring.js';

export { arbTournament, competitors, round, simulateTournament } from './history.js';
export type { EntrySpec, SimulatedTournament, SimulationOptions, TournamentArbOptions } from './history.js';

export { loadGoldenCase, loadPairingTables } from './golden.js';
export type { GoldenCase, PairingTables } from './golden.js';

export { benchOptions, percentile } from './bench.js';
export type { BenchRunOptions } from './bench.js';
