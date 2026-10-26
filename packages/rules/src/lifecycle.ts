import { canonicalJson, DomainError, err, ok } from '@torre/core';
import type { Result } from '@torre/core';
import type { ProvenanceEntry, RuleSet } from './schema.js';

/** Values a rule set must define before it can be approved, even if no provenance entry names them. */
const REQUIRED_FOR_APPROVAL = [
  'roundsPolicy',
  'tiebreaks',
  'tiebreakPolicy.unplayedRounds',
  'tiebreakPolicy.unresolved',
] as const;

export interface UnconfirmedField {
  readonly path: string;
  readonly status: 'UNCONFIRMED' | 'MISSING';
  readonly source?: string;
  readonly question?: string;
  readonly note?: string;
}

/** Reads a dotted path such as "scoring.win" from a rule set; undefined when any step is absent. */
export function valueAt(ruleSet: RuleSet, path: string): unknown {
  let current: unknown = ruleSet;
  for (const step of path.split('.')) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[step];
  }
  return current;
}

const toField = (path: string, entry: ProvenanceEntry): UnconfirmedField => ({
  path,
  status: entry.status === 'MISSING' ? 'MISSING' : 'UNCONFIRMED',
  ...(entry.source === undefined ? {} : { source: entry.source }),
  ...(entry.question === undefined ? {} : { question: entry.question }),
  ...(entry.note === undefined ? {} : { note: entry.note }),
});

/** Parameters marked unconfirmed or missing (US-010:AC3); `[ASCUN-2012]` values count as unconfirmed (BR-GEN-04). */
export function listUnconfirmedFields(ruleSet: RuleSet): UnconfirmedField[] {
  const fields = Object.entries(ruleSet.provenance)
    .filter(([, entry]) => entry.status !== 'CONFIRMED')
    .map(([path, entry]) => toField(path, entry));
  for (const path of REQUIRED_FOR_APPROVAL) {
    if (valueAt(ruleSet, path) === undefined && !(path in ruleSet.provenance)) fields.push({ path, status: 'MISSING' });
  }
  return fields.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

/** Approval needs every value confirmed and a cited source document with its version (BR-GEN-04). */
export function canApprove(ruleSet: RuleSet): boolean {
  return listUnconfirmedFields(ruleSet).length === 0 && ruleSet.source.documentVersion !== undefined;
}

type LifecycleError = DomainError<
  'RULESET_IMMUTABLE' | 'INVALID_TRANSITION' | 'RULESET_NOT_APPROVABLE' | 'RULESET_VERSION_MISMATCH'
>;

const withoutStatus = ({ status: _status, ...rest }: RuleSet): string => canonicalJson(rest);

/**
 * Checks that `next` is an allowed successor of `prev` for the same key and version (US-010:AC5):
 * DRAFT may change freely and becomes APPROVED only when approvable; APPROVED is immutable and may only
 * be DEPRECATED; DEPRECATED is final. Changing an approved rule set means creating a new version.
 */
export function assertImmutable(prev: RuleSet, next: RuleSet): Result<RuleSet, LifecycleError> {
  if (prev.key !== next.key || prev.version !== next.version) {
    return err(
      new DomainError('RULESET_VERSION_MISMATCH', {
        prev: `${prev.key}@${prev.version}`,
        next: `${next.key}@${next.version}`,
      }),
    );
  }
  const allowed: Readonly<Record<RuleSet['status'], readonly RuleSet['status'][]>> = {
    DRAFT: ['DRAFT', 'APPROVED'],
    APPROVED: ['APPROVED', 'DEPRECATED'],
    DEPRECATED: ['DEPRECATED'],
  };
  if (!allowed[prev.status].includes(next.status)) {
    return err(new DomainError('INVALID_TRANSITION', { from: prev.status, to: next.status }));
  }
  if (prev.status !== 'DRAFT' && withoutStatus(prev) !== withoutStatus(next)) {
    return err(new DomainError('RULESET_IMMUTABLE', { key: prev.key, version: prev.version }));
  }
  if (prev.status === 'DRAFT' && next.status === 'APPROVED' && !canApprove(next)) {
    return err(
      new DomainError('RULESET_NOT_APPROVABLE', { unconfirmed: listUnconfirmedFields(next).map((f) => f.path) }),
    );
  }
  return ok(next);
}
