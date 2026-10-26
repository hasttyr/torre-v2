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
 * Fields every file under `packages/<package>/test/golden/` carries (TESTING.md §7). The values under
 * `expected` are checked by hand or transcribed from an official source, never copied from the code
 * under test (TEST-PLAN.md §6).
 */
const goldenMeta = {
  id: z.string().regex(/^(GV-\d{3}|SRC-\d{2})$/),
  description: z.string().min(1),
  source: z.string().min(1),
  verifiedBy: z.string().min(1),
  verifiedAt: z.iso.date(),
  rules: z.array(z.string().regex(/^(BR|INV|DEC)-/)).min(1),
};

/** A tournament history with its expected standings. */
const goldenCaseSchema = z.strictObject({
  ...goldenMeta,
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

/** A pairing table as FIDE prints it: one string per round, `white-black` pairs from board 1 down. */
const pairingTablesSchema = z.strictObject({
  ...goldenMeta,
  input: z.record(z.string(), z.unknown()),
  expected: z.strictObject({
    tables: z.record(z.string().regex(/^\d+$/), z.array(z.string().min(1)).min(1)),
  }),
});

export interface PairingTables {
  readonly id: string;
  readonly source: string;
  /** Participants → rounds → `[white, black]` pairs, board 1 first. */
  readonly tables: ReadonlyMap<number, readonly (readonly [number, number])[][]>;
}

const PAIR = /(\d+)\s*[-–]\s*(\d+)/g;

/** Parses a golden file of pairing tables; any separator between pairs is accepted (`,` or a stray `.`). */
export function loadPairingTables(json: unknown): PairingTables {
  const golden = pairingTablesSchema.parse(json);
  const tables = new Map(
    Object.entries(golden.expected.tables).map(([players, rounds]) => [
      Number(players),
      rounds.map((text) => [...text.matchAll(PAIR)].map((m) => [Number(m[1]), Number(m[2])] as const)),
    ]),
  );
  return { id: golden.id, source: golden.source, tables };
}
