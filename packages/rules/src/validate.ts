import { canonicalJson, DomainError, err, ok } from '@torre/core';
import type { Result } from '@torre/core';
import { MODIFIABLE_TIEBREAKS, MULTI_LISTABLE_TIEBREAKS } from './catalog.js';
import type { TeamTiebreakId, TiebreakId } from './catalog.js';
import { canApprove, valueAt } from './lifecycle.js';
import { ruleSetSchema } from './schema.js';
import type { RoundsPolicy, RuleSet } from './schema.js';

export interface ValidationIssue {
  /** Name of the rule that failed, stable for tests and messages. */
  readonly rule: string;
  readonly path: string;
  readonly message: string;
}

export interface ValidationContext {
  /** PLATFORM presets have no organization; ORGANIZATION rule sets must have one (DEC-047). */
  readonly scope: 'PLATFORM' | 'ORGANIZATION';
}

const ROUNDS_POLICY_BY_SYSTEM: Readonly<Record<RuleSet['system'], readonly RoundsPolicy['kind'][]>> = {
  SWISS: ['FIXED', 'TABLE'],
  ROUND_ROBIN: ['ALL_PLAY_ALL'],
  DOUBLE_ROUND_ROBIN: ['ALL_PLAY_ALL'],
  KNOCKOUT: ['ELIMINATION'],
};

function tiebreakListIssues(
  list: readonly { id: TiebreakId | TeamTiebreakId; modifiers?: readonly string[] | undefined }[],
  path: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seen = new Set<string>();
  list.forEach((tb, i) => {
    if (tb.modifiers !== undefined && !(MODIFIABLE_TIEBREAKS as readonly string[]).includes(tb.id)) {
      issues.push({
        rule: 'tiebreak-modifier-allowed',
        path: `${path}.${i}`,
        message: `${tb.id} has no values a modifier could cut (C.07 Art. 14)`,
      });
    }
    const fingerprint = canonicalJson(tb);
    if (seen.has(fingerprint) && !MULTI_LISTABLE_TIEBREAKS.includes(tb.id)) {
      issues.push({
        rule: 'tiebreak-not-repeated',
        path: `${path}.${i}`,
        message: `${tb.id} is listed twice; only type A tie-breaks may repeat (C.07 Art. 4.3)`,
      });
    }
    seen.add(fingerprint);
  });
  return issues;
}

/** Cross-field rules of US-010:AC2 that a structural schema cannot express. */
export function crossFieldIssues(rs: RuleSet, { scope }: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const add = (rule: string, path: string, message: string) => issues.push({ rule, path, message });

  if ((rs.format === 'TEAM') !== (rs.team !== undefined)) {
    add('team-only-for-team-format', 'team', 'the team block exists if and only if format is TEAM');
  }
  if ((rs.system === 'SWISS') !== (rs.swiss !== undefined)) {
    add('swiss-block-matches-system', 'swiss', 'the swiss block exists if and only if system is SWISS');
  }
  if (rs.roundRobin !== undefined && rs.system !== 'ROUND_ROBIN' && rs.system !== 'DOUBLE_ROUND_ROBIN') {
    add('round-robin-block-matches-system', 'roundRobin', 'the roundRobin block only applies to round robins');
  }
  const policy = rs.roundsPolicy;
  if (policy !== undefined && !ROUNDS_POLICY_BY_SYSTEM[rs.system].includes(policy.kind)) {
    add('rounds-policy-matches-system', 'roundsPolicy.kind', `${rs.system} cannot use a ${policy.kind} rounds policy`);
  }
  if (policy?.kind === 'TABLE') {
    const rows = [...policy.table].sort((a, b) => a.min - b.min);
    rows.forEach((row, i) => {
      const previous = rows[i - 1];
      if (row.min > row.max || (previous !== undefined && row.min <= previous.max)) {
        add('rounds-table-ranges', 'roundsPolicy.table', 'participant ranges must be ordered and must not overlap');
      }
    });
  }
  const { win, draw, loss } = rs.scoring;
  if (!(win >= draw && draw >= loss)) add('scoring-order', 'scoring', 'scores must satisfy win ≥ draw ≥ loss');
  if (rs.tiebreaks !== undefined) issues.push(...tiebreakListIssues(rs.tiebreaks, 'tiebreaks'));
  if (rs.team !== undefined) issues.push(...tiebreakListIssues(rs.team.teamTiebreaks, 'team.teamTiebreaks'));
  if (rs.requestedByes.allowed && rs.requestedByes.kind === undefined) {
    add(
      'requested-bye-kind',
      'requestedByes.kind',
      'allowed requested byes must say whether they are half-point or zero-point',
    );
  }
  for (const [path, entry] of Object.entries(rs.provenance)) {
    const present = valueAt(rs, path) !== undefined;
    if ((entry.status === 'MISSING') === present) {
      add(
        'provenance-matches-values',
        `provenance.${path}`,
        entry.status === 'MISSING' ? 'a MISSING value must be absent' : 'only MISSING values may be absent',
      );
    }
  }
  if ((scope === 'PLATFORM') !== (rs.organizationId === null)) {
    add(
      'organization-scope',
      'organizationId',
      'platform presets have no organization; every other rule set has one (DEC-047)',
    );
  }
  if (rs.status === 'APPROVED' && !canApprove(rs)) {
    add(
      'approved-must-be-approvable',
      'status',
      'an approved rule set has every value confirmed and a versioned source (BR-GEN-04)',
    );
  }
  return issues;
}

/** Parses and validates a rule set (US-010:AC1–AC2). */
export function validateRuleSet(
  input: unknown,
  context: ValidationContext,
): Result<RuleSet, DomainError<'INVALID_RULESET'>> {
  const parsed = ruleSetSchema.safeParse(input);
  if (!parsed.success) {
    const issues: ValidationIssue[] = parsed.error.issues.map((i) => ({
      rule: 'schema',
      path: i.path.join('.'),
      message: i.message,
    }));
    return err(new DomainError('INVALID_RULESET', { issues }));
  }
  const issues = crossFieldIssues(parsed.data, context);
  return issues.length > 0 ? err(new DomainError('INVALID_RULESET', { issues })) : ok(parsed.data);
}
