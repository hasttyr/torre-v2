// Public API of @torre/rules: the RuleSet schema, its validation, lifecycle and presets (US-010).
export {
  MODIFIABLE_TIEBREAKS,
  MULTI_LISTABLE_TIEBREAKS,
  TEAM_TIEBREAK_IDS,
  TIEBREAK_IDS,
  TIEBREAK_MODIFIERS,
} from './catalog.js';
export type { TeamTiebreakId, TiebreakId, TiebreakModifier } from './catalog.js';

export { RULESET_STATUSES, ruleSetJsonSchema, ruleSetSchema } from './schema.js';
export type { ProvenanceEntry, RoundsPolicy, RuleSet, Scoring, TiebreakSpec } from './schema.js';

export { crossFieldIssues, validateRuleSet } from './validate.js';
export type { ValidationContext, ValidationIssue } from './validate.js';

export { assertImmutable, canApprove, listUnconfirmedFields, valueAt } from './lifecycle.js';
export type { UnconfirmedField } from './lifecycle.js';
