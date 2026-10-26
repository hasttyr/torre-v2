// Global fast-check parameters for every property test (TESTING.md §9, TEST-PLAN.md §6.2.2):
// 200 runs with a fixed seed by default; `pnpm test:nightly` sets FC_NUM_RUNS=5000 and a random FC_SEED.
// FC_PATH replays a reported counterexample.
import fc from 'fast-check';
import { fastCheckParams } from '../lib/fast-check-params.mjs';

const { numRuns, seed, path } = fastCheckParams(process.env);
fc.configureGlobal({ numRuns, seed, ...(path === undefined ? {} : { path }) });
