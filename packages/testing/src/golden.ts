import { z } from 'zod';
import { BYE_KINDS, competitorId, GAME_RESULTS } from '@torre/core';
import type { Competitor, Round } from '@torre/core';
import type { Scoring } from '@torre/rules';
import { round } from './history.js';

const id = z.string().min(1);
const units = z.int().min(0);

const entrySpec = z.union([
  z.strictObject({ white: id, black: id, result: z.enum(GAME_RESULTS) }),
  z.strictObject({ bye: id, kind: z.enum(BYE_KINDS) }),
]);

/**
 * Format of `packages/<package>/test/golden/*.json` (TESTING.md §7). The values under `expected` are
 * checked by hand and never copied from the code under test (TEST-PLAN.md §6).
 */
const goldenCaseSchema = z.strictObject({
  id: z.string().regex(/^GV-\d{3}$/),
  description: z.string().min(1),
  source: z.string().min(1),
  verifiedBy: z.string().min(1),
  verifiedAt: z.iso.date(),
  rules: z.array(z.string().regex(/^(BR|INV|DEC)-/)).min(1),
  input: z.strictObject({
    scoring: z
      .strictObject({
        win: units,
        draw: units,
        loss: units,
        forfeitWin: units,
        forfeitLoss: units,
        doubleForfeit: units,
        pairingBye: units,
        halfPointBye: units,
        zeroPointBye: units,
      })
      .optional(),
    gamesPerPairing: z.union([z.literal(1), z.literal(2)]).default(1),
    competitors: z
      .array(
        z.strictObject({
          id,
          seed: z.int().positive(),
          status: z.enum(['ACTIVE', 'WITHDRAWN']).default('ACTIVE'),
        }),
      )
      .min(1),
    rounds: z.array(z.array(entrySpec)),
  }),
  expected: z.record(z.string(), z.unknown()),
});

export interface GoldenCase {
  readonly id: string;
  readonly description: string;
  readonly source: string;
  readonly rules: readonly string[];
  readonly scoring: Scoring | undefined;
  readonly gamesPerPairing: 1 | 2;
  readonly competitors: readonly Competitor[];
  readonly history: readonly Round[];
  readonly expected: Readonly<Record<string, unknown>>;
}

/** Parses a golden file; a malformed file is a broken test, so it throws. */
export function loadGoldenCase(json: unknown): GoldenCase {
  const golden = goldenCaseSchema.parse(json);
  const { input } = golden;
  return {
    id: golden.id,
    description: golden.description,
    source: golden.source,
    rules: golden.rules,
    scoring: input.scoring,
    gamesPerPairing: input.gamesPerPairing,
    competitors: input.competitors.map((c) => ({ id: competitorId(c.id), seed: c.seed, status: c.status })),
    history: input.rounds.map((specs, i) => round(i + 1, specs)),
    expected: golden.expected,
  };
}
