// Types for fast-check-params.mjs, so TypeScript configs can import it without suppressions.
export declare const PR_RUNS: number;
export declare const PR_SEED: number;

export interface FastCheckParams {
  readonly mode: string;
  readonly seed: number;
  readonly numRuns: number;
  readonly path?: string;
}

export declare function fastCheckParams(env: Record<string, string | undefined>): FastCheckParams;
