import { inject } from 'vitest';

declare module 'vitest' {
  export interface ProvidedContext {
    /** `reduced` in every CI run, `full` at night (US-096:AC4, TEST-PLAN.md §6.1); set in vitest.config.ts. */
    benchMode: 'reduced' | 'full';
  }
}

export interface BenchRunOptions {
  readonly time: number;
  readonly iterations: number;
  readonly warmupIterations: number;
}

/** tinybench options for the current mode: the reduced mode catches large regressions in seconds. */
export function benchOptions(): BenchRunOptions {
  return inject('benchMode') === 'full'
    ? { time: 2_000, iterations: 200, warmupIterations: 20 }
    : { time: 200, iterations: 20, warmupIterations: 5 };
}

/** Nearest-rank percentile of latency samples, in the samples' unit (`p` in 0–100). */
export function percentile(samples: readonly number[], p: number): number {
  if (samples.length === 0) throw new RangeError('percentile of an empty sample');
  const sorted = [...samples].sort((a, b) => a - b);
  const rank = Math.min(sorted.length, Math.max(1, Math.ceil((p / 100) * sorted.length)));
  return sorted[rank - 1] ?? Number.NaN;
}
