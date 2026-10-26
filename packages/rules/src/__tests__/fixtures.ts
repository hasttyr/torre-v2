// Test data only: a complete, structurally valid RuleSet that tests mutate. These values are not rules.
import type { RuleSet } from '../schema.js';

export function aRuleSet(overrides: Partial<RuleSet> = {}): RuleSet {
  return {
    key: 'test-swiss',
    version: 1,
    status: 'DRAFT',
    organizationId: 'org-1',
    demo: false,
    source: { authority: 'Test', document: 'Fixture', documentVersion: '1' },
    provenance: {},
    format: 'INDIVIDUAL',
    system: 'SWISS',
    roundsPolicy: { kind: 'FIXED', rounds: 5 },
    gamesPerPairing: 1,
    scoring: {
      win: 2,
      draw: 1,
      loss: 0,
      forfeitWin: 2,
      forfeitLoss: 0,
      doubleForfeit: 0,
      pairingBye: 2,
      halfPointBye: 1,
      zeroPointBye: 0,
    },
    requestedByes: { allowed: false, requiresJustification: false },
    swiss: { variant: 'FIDE_DUTCH', ruleVersion: '2026-02-01', initialColour: 'DRAW_LOTS' },
    tiebreaks: [{ id: 'BUCHHOLZ', modifiers: ['CUT1'] }, { id: 'SONNEBORN_BERGER' }],
    tiebreakPolicy: { unplayedRounds: 'FIDE_C07_2026', restartOnPartialSplit: false, unresolved: 'SHARE_RANK' },
    eligibility: { mode: 'NONE' },
    seeding: { order: ['FIDE_RATING'] },
    corrections: {},
    rating: { computePlatformElo: true, initialRating: 1500 },
    ...overrides,
  };
}
