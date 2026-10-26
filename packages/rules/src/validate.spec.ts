import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { aRuleSet } from './__tests__/fixtures.js';
import { assertImmutable, canApprove, listUnconfirmedFields } from './lifecycle.js';
import type { RuleSet } from './schema.js';
import { validateRuleSet } from './validate.js';

const codesOf = (input: unknown, scope: 'PLATFORM' | 'ORGANIZATION' = 'ORGANIZATION'): string[] => {
  const result = validateRuleSet(input, { scope });
  return result.ok ? [] : (result.error.details['issues'] as { rule: string }[]).map((i) => i.rule);
};

const roundRobin = (): RuleSet => {
  const { swiss: _swiss, ...rest } = aRuleSet({ system: 'ROUND_ROBIN', roundsPolicy: { kind: 'ALL_PLAY_ALL' } });
  return { ...rest, roundRobin: { reverseLastTwoRoundsOfFirstCycle: true } };
};

const teamBlock: NonNullable<RuleSet['team']> = {
  boardsPerMatch: 4,
  minPlayersToStart: 3,
  boardOrder: 'RATING_DESC',
  primaryScore: 'MATCH_POINTS',
  matchScoring: { win: 2, draw: 1, loss: 0 },
  teamTiebreaks: [{ id: 'MPVGP' }],
};

/** Valid rule sets: random coherent scoring and choices on top of the fixture. */
const validRuleSetArb = fc
  .record({
    loss: fc.integer({ min: 0, max: 2 }),
    drawExtra: fc.integer({ min: 0, max: 2 }),
    winExtra: fc.integer({ min: 0, max: 2 }),
    rounds: fc.integer({ min: 1, max: 15 }),
    unresolved: fc.constantFrom('SHARE_RANK' as const, 'DRAW_LOTS' as const, 'PLAYOFF' as const),
    team: fc.boolean(),
  })
  .map(({ loss, drawExtra, winExtra, rounds, unresolved, team }) => {
    const draw = loss + drawExtra;
    const base = aRuleSet({
      roundsPolicy: { kind: 'FIXED', rounds },
      scoring: { ...aRuleSet().scoring, loss, draw, win: draw + winExtra },
      tiebreakPolicy: { ...aRuleSet().tiebreakPolicy, unresolved },
    });
    return team ? { ...base, format: 'TEAM' as const, team: teamBlock } : base;
  });

describe('RuleSet cross-field validation (US-010:AC2)', () => {
  it('[US-010:AC2][TC-005] should accept random coherent rule sets', () => {
    fc.assert(
      fc.property(validRuleSetArb, (ruleSet) => {
        expect(codesOf(ruleSet)).toEqual([]);
      }),
    );
  });

  it('[US-010:AC2][TC-005] should reject every incoherent mutation with the rule it breaks', () => {
    const mutations: readonly [string, () => unknown, string][] = [
      ['team block without TEAM format', () => aRuleSet({ team: teamBlock }), 'team-only-for-team-format'],
      ['TEAM format without team block', () => aRuleSet({ format: 'TEAM' }), 'team-only-for-team-format'],
      ['Swiss without swiss block', () => ({ ...aRuleSet(), swiss: undefined }), 'swiss-block-matches-system'],
      [
        'round robin with swiss block',
        () => ({ ...roundRobin(), swiss: aRuleSet().swiss }),
        'swiss-block-matches-system',
      ],
      [
        'roundRobin block in a Swiss',
        () => aRuleSet({ roundRobin: { reverseLastTwoRoundsOfFirstCycle: true } }),
        'round-robin-block-matches-system',
      ],
      [
        'round robin with fixed rounds',
        () => ({ ...roundRobin(), roundsPolicy: { kind: 'FIXED', rounds: 5 } }),
        'rounds-policy-matches-system',
      ],
      [
        'Swiss with all-play-all',
        () => aRuleSet({ roundsPolicy: { kind: 'ALL_PLAY_ALL' } }),
        'rounds-policy-matches-system',
      ],
      [
        'overlapping rounds table',
        () =>
          aRuleSet({
            roundsPolicy: {
              kind: 'TABLE',
              table: [
                { min: 1, max: 10, rounds: 5 },
                { min: 10, max: 20, rounds: 6 },
              ],
            },
          }),
        'rounds-table-ranges',
      ],
      ['draw worth more than a win', () => aRuleSet({ scoring: { ...aRuleSet().scoring, draw: 3 } }), 'scoring-order'],
      ['loss worth more than a draw', () => aRuleSet({ scoring: { ...aRuleSet().scoring, loss: 2 } }), 'scoring-order'],
      [
        'modifier on a tie-break without values to cut',
        () => aRuleSet({ tiebreaks: [{ id: 'WIN', modifiers: ['CUT1'] }] }),
        'tiebreak-modifier-allowed',
      ],
      [
        'the same tie-break twice',
        () => aRuleSet({ tiebreaks: [{ id: 'SONNEBORN_BERGER' }, { id: 'SONNEBORN_BERGER' }] }),
        'tiebreak-not-repeated',
      ],
      [
        'requested byes without their kind',
        () => aRuleSet({ requestedByes: { allowed: true, requiresJustification: false } }),
        'requested-bye-kind',
      ],
      [
        'MISSING value that is present',
        () => aRuleSet({ provenance: { 'scoring.win': { status: 'MISSING' } } }),
        'provenance-matches-values',
      ],
      [
        'UNCONFIRMED value that is absent',
        () => aRuleSet({ provenance: { 'timeControl.baseMinutes': { status: 'UNCONFIRMED' } } }),
        'provenance-matches-values',
      ],
      [
        'approved rule set with an unconfirmed value',
        () => aRuleSet({ status: 'APPROVED', provenance: { 'scoring.win': { status: 'UNCONFIRMED' } } }),
        'approved-must-be-approvable',
      ],
    ];
    for (const [label, build, rule] of mutations) expect(codesOf(build()), label).toContain(rule);
  });

  it('[US-010:AC2][TC-005] should accept a round robin and repeated direct encounter (type A)', () => {
    expect(codesOf(roundRobin())).toEqual([]);
    expect(
      codesOf(aRuleSet({ tiebreaks: [{ id: 'DIRECT_ENCOUNTER' }, { id: 'BUCHHOLZ' }, { id: 'DIRECT_ENCOUNTER' }] })),
    ).toEqual([]);
  });

  it('[US-010:AC2][DEC-047] should allow a null organization only for platform presets', () => {
    expect(codesOf(aRuleSet({ organizationId: null }), 'ORGANIZATION')).toContain('organization-scope');
    expect(codesOf(aRuleSet({ organizationId: 'org-1' }), 'PLATFORM')).toContain('organization-scope');
    expect(codesOf(aRuleSet({ organizationId: null }), 'PLATFORM')).toEqual([]);
  });

  it('[US-010:AC1] should report structural errors with the schema rule', () => {
    expect(codesOf({ key: 'x' })).toContain('schema');
  });
});

describe('RuleSet lifecycle (BR-GEN-04)', () => {
  it('[US-010:AC3][TC-005][BR-GEN-04] should list unconfirmed and missing values and block approval until there are none', () => {
    const draft = aRuleSet({
      tiebreakPolicy: { restartOnPartialSplit: false },
      provenance: { 'scoring.win': { status: 'UNCONFIRMED', source: 'SRC-01 Art. 9', question: 'OQ-001' } },
    });

    expect(listUnconfirmedFields(draft).map((f) => f.path)).toEqual([
      'scoring.win',
      'tiebreakPolicy.unplayedRounds',
      'tiebreakPolicy.unresolved',
    ]);
    expect(canApprove(draft)).toBe(false);
    expect(canApprove(aRuleSet())).toBe(true);
  });

  it('[US-010:AC3][BR-GEN-04] should not approve without the source document and its version', () => {
    expect(canApprove(aRuleSet({ source: { authority: 'Test', document: 'Fixture' } }))).toBe(false);
  });

  it('[US-010:AC5][BR-GEN-04] should keep an approved version immutable except for deprecation', () => {
    const approved = aRuleSet({ status: 'APPROVED' });

    expect(assertImmutable(approved, approved).ok).toBe(true);
    expect(assertImmutable(approved, { ...approved, status: 'DEPRECATED' }).ok).toBe(true);
    const changed = assertImmutable(approved, { ...approved, scoring: { ...approved.scoring, draw: 2 } });
    expect(changed.ok ? undefined : changed.error.code).toBe('RULESET_IMMUTABLE');
    const back = assertImmutable({ ...approved, status: 'DEPRECATED' }, approved);
    expect(back.ok ? undefined : back.error.code).toBe('INVALID_TRANSITION');
  });

  it('[US-010:AC5][BR-GEN-04] should let a draft change, approve it only when approvable and refuse other identities', () => {
    const draft = aRuleSet();

    expect(assertImmutable(draft, { ...draft, roundsPolicy: { kind: 'FIXED', rounds: 7 } }).ok).toBe(true);
    expect(assertImmutable(draft, { ...draft, status: 'APPROVED' }).ok).toBe(true);
    const notApprovable = assertImmutable(draft, {
      ...draft,
      status: 'APPROVED',
      provenance: { 'scoring.win': { status: 'UNCONFIRMED' } },
    });
    expect(notApprovable.ok ? undefined : notApprovable.error.code).toBe('RULESET_NOT_APPROVABLE');
    const skip = assertImmutable(draft, { ...draft, status: 'DEPRECATED' });
    expect(skip.ok ? undefined : skip.error.code).toBe('INVALID_TRANSITION');
    const other = assertImmutable(draft, { ...draft, version: 2 });
    expect(other.ok ? undefined : other.error.code).toBe('RULESET_VERSION_MISMATCH');
  });
});
