import { z } from 'zod';
import { TEAM_TIEBREAK_IDS, TIEBREAK_IDS, TIEBREAK_MODIFIERS } from './catalog.js';

/**
 * The RuleSet: the rules of a competition as versioned data (BR-GEN-02, DEC-027). The structural schema
 * is here; cross-field rules and the lifecycle are in validate.ts and lifecycle.ts. Scores are integer
 * half-point units (BR-NUM-01). Values a draft may still lack are optional, and `provenance` records
 * where each value comes from and which ones are not confirmed (BR-GEN-03, BR-GEN-04).
 */

const units = z.number().int().min(0).max(1000);
const positiveInt = z.number().int().min(1);

export const RULESET_STATUSES = ['DRAFT', 'APPROVED', 'DEPRECATED'] as const;

const source = z.strictObject({
  authority: z.string().min(1),
  document: z.string().min(1),
  documentVersion: z.string().min(1).optional(),
  url: z.url().optional(),
  retrievedAt: z.iso.date().optional(),
  /** Entry of docs/SOURCES.md, e.g. "SRC-01". */
  sourceId: z
    .string()
    .regex(/^SRC-\d{2}$/)
    .optional(),
});

const provenanceEntry = z.strictObject({
  status: z.enum(['CONFIRMED', 'UNCONFIRMED', 'MISSING']),
  /** Where the value comes from, e.g. "SRC-01 Art. 9". */
  source: z.string().min(1).optional(),
  /** Open question that would confirm it, e.g. "OQ-001". */
  question: z
    .string()
    .regex(/^OQ-\d{3}$/)
    .optional(),
  note: z.string().min(1).optional(),
});

const roundsPolicy = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('FIXED'), rounds: positiveInt }),
  z.strictObject({
    kind: z.literal('TABLE'),
    table: z.array(z.strictObject({ min: positiveInt, max: positiveInt, rounds: positiveInt })).min(1),
  }),
  /** Every competitor meets every other once (twice in a double round robin). */
  z.strictObject({ kind: z.literal('ALL_PLAY_ALL') }),
  z.strictObject({ kind: z.literal('ELIMINATION') }),
]);

const scoring = z.strictObject({
  win: units,
  draw: units,
  loss: units,
  forfeitWin: units,
  forfeitLoss: units,
  doubleForfeit: units,
  /** Pairing-allocated bye (C.04.1 Art. 3). */
  pairingBye: units,
  halfPointBye: units,
  zeroPointBye: units,
});

const requestedByes = z.strictObject({
  allowed: z.boolean(),
  kind: z.enum(['HALF_POINT', 'ZERO_POINT']).optional(),
  allowedRounds: z.array(positiveInt).optional(),
  maxPerPlayer: positiveInt.optional(),
  requiresJustification: z.boolean(),
});

const swiss = z.strictObject({
  variant: z.literal('FIDE_DUTCH'),
  /** Date the applied version took effect, e.g. "2026-02-01" (SRC-05). */
  ruleVersion: z.iso.date(),
  initialColour: z.enum(['DRAW_LOTS', 'WHITE', 'BLACK']),
  maxByesPerPlayer: positiveInt.optional(),
  avoidSameInstitutionRounds: z.array(positiveInt).optional(),
});

const tiebreak = z.strictObject({
  id: z.enum(TIEBREAK_IDS),
  modifiers: z.array(z.enum(TIEBREAK_MODIFIERS)).min(1).optional(),
  params: z.record(z.string(), z.union([z.number(), z.string(), z.boolean()])).optional(),
});

const teamTiebreak = z.strictObject({
  id: z.enum([...TIEBREAK_IDS, ...TEAM_TIEBREAK_IDS]),
  modifiers: z.array(z.enum(TIEBREAK_MODIFIERS)).min(1).optional(),
});

const team = z.strictObject({
  boardsPerMatch: positiveInt,
  minPlayersToStart: positiveInt,
  boardOrder: z.enum(['RATING_DESC', 'FREE', 'FIXED']),
  primaryScore: z.enum(['MATCH_POINTS', 'GAME_POINTS']),
  matchScoring: z.strictObject({ win: units, draw: units, loss: units }),
  teamTiebreaks: z.array(teamTiebreak),
});

const timeControl = z.strictObject({
  modality: z.enum(['CLASSICAL', 'RAPID', 'BLITZ']),
  baseMinutes: z.number().positive(),
  incrementSeconds: z.number().int().min(0),
  forfeitToleranceMinutes: z.number().int().min(0),
});

export const ruleSetSchema = z.strictObject({
  key: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'kebab-case'),
  version: positiveInt,
  status: z.enum(RULESET_STATUSES),
  /** null = platform preset, approved only by platform_admin (DEC-047). */
  organizationId: z.string().min(1).nullable(),
  /** Demo rule sets may carry proposed values and never govern an official tournament (BR-GEN-03). */
  demo: z.boolean(),
  source,
  provenance: z.record(z.string().min(1), provenanceEntry),
  format: z.enum(['INDIVIDUAL', 'TEAM']),
  system: z.enum(['SWISS', 'ROUND_ROBIN', 'DOUBLE_ROUND_ROBIN', 'KNOCKOUT']),
  /** Declared before the tournament (C.04.1 Art. 1); a draft may still lack it. */
  roundsPolicy: roundsPolicy.optional(),
  /** 2 = two games against the same opponent with colours reversed, each scored on its own (BR-SCORE-01). */
  gamesPerPairing: z.union([z.literal(1), z.literal(2)]),
  scoring,
  requestedByes,
  swiss: swiss.optional(),
  roundRobin: z.strictObject({ reverseLastTwoRoundsOfFirstCycle: z.boolean() }).optional(),
  /** Ordered list: the order is the priority (BR-TIE-01); chosen by the organiser (C.07 Art. 4.1). */
  tiebreaks: z.array(tiebreak).optional(),
  tiebreakPolicy: z.strictObject({
    unplayedRounds: z.enum(['FIDE_C07_2026', 'AS_AWARDED', 'CUSTOM']).optional(),
    restartOnPartialSplit: z.boolean(),
    unresolved: z.enum(['SHARE_RANK', 'DRAW_LOTS', 'PLAYOFF']).optional(),
  }),
  team: team.optional(),
  eligibility: z.strictObject({ mode: z.enum(['EXTERNAL_VERIFICATION', 'NONE']) }),
  entryQuota: z
    .strictObject({
      perInstitution: positiveInt.optional(),
      perNode: z.strictObject({ male: positiveInt.optional(), female: positiveInt.optional() }).optional(),
    })
    .optional(),
  timeControl: timeControl.optional(),
  schedule: z.strictObject({ maxRoundsPerDay: positiveInt.optional() }).optional(),
  /** Strength criteria in order; then FIDE title, name and id (BR-REG-04). */
  seeding: z.strictObject({ order: z.array(z.enum(['FIDE_RATING', 'NATIONAL_RATING', 'PLATFORM_RATING'])) }),
  /** Deadline to report a wrong result after a round is published, ISO 8601 duration (BR-AUD-03). */
  corrections: z.strictObject({ noticeDeadline: z.iso.duration().optional() }),
  rating: z.strictObject({ computePlatformElo: z.boolean(), initialRating: z.number().int().min(0).max(4000) }),
});

export type RuleSet = z.infer<typeof ruleSetSchema>;
export type Scoring = RuleSet['scoring'];
export type RoundsPolicy = NonNullable<RuleSet['roundsPolicy']>;
export type TiebreakSpec = NonNullable<RuleSet['tiebreaks']>[number];
export type ProvenanceEntry = RuleSet['provenance'][string];

/** JSON Schema of the RuleSet, for documentation (US-010:AC6). Cross-field rules are not expressible here. */
export function ruleSetJsonSchema(): Record<string, unknown> {
  return z.toJSONSchema(ruleSetSchema, { target: 'draft-2020-12' });
}
