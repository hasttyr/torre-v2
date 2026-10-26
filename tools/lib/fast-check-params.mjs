// Property-test parameters shared by vitest.config.ts, the run manifest and the nightly run
// (TESTING.md §9, TEST-PLAN.md §6.2.2): 200 runs with a fixed seed in PRs; the nightly run sets
// FC_NUM_RUNS=5000 and a random FC_SEED that the manifest records. FC_PATH replays a counterexample.
export const PR_RUNS = 200;
export const PR_SEED = 20261026;

/** @param {Record<string, string | undefined>} env */
export function fastCheckParams(env) {
  const numRuns = Number.parseInt(env.FC_NUM_RUNS ?? '', 10);
  const seed = Number.parseInt(env.FC_SEED ?? '', 10);
  return {
    mode: env.FC_MODE ?? (env.FC_NUM_RUNS ? 'custom' : 'pr'),
    seed: Number.isFinite(seed) ? seed : PR_SEED,
    numRuns: Number.isFinite(numRuns) && numRuns > 0 ? numRuns : PR_RUNS,
    ...(env.FC_PATH ? { path: env.FC_PATH } : {}),
  };
}
