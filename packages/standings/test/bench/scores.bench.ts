import { expect, test } from 'vitest';
import { aScoring, benchOptions, percentile, simulateTournament } from '@torre/testing';
import { computeScores, rankByPoints } from '../../src/index.js';

/** ARCHITECTURE.md §17: recalculating the standings of 500 players after 9 rounds takes ≤ 100 ms p95. */
const BUDGET_MS = 100;

test('[US-012:AC5][TC-060] should score and rank 500 competitors after 9 rounds within 100 ms p95', async ({
  bench,
  annotate,
}) => {
  const { competitors, history } = simulateTournament({ competitors: 500, rounds: 9, seed: 20261026 });
  const rules = { scoring: aScoring().build(), gamesPerPairing: 1 as const };

  const result = await bench('computeScores + rankByPoints, 500×9', () => {
    const table = computeScores(history, rules, competitors);
    if (!table.ok) throw new Error('the simulated history must be consistent');
    rankByPoints(table.value);
  }).run(benchOptions());

  const samples = result.latency.samples ?? [];
  const p95 = percentile(samples, 95);
  await annotate(`p95 ${p95.toFixed(3)} ms · media ${result.latency.mean.toFixed(3)} ms · ${samples.length} muestras`);
  expect(p95).toBeLessThanOrEqual(BUDGET_MS);
});
