import { describe, expect, it } from 'vitest';
import { aRuleSet } from './__tests__/fixtures.js';
import { ruleSetJsonSchema, ruleSetSchema } from './schema.js';

describe('RuleSet schema (US-010)', () => {
  it('[US-010:AC1] should accept a complete rule set', () => {
    expect(ruleSetSchema.safeParse(aRuleSet()).success).toBe(true);
  });

  it('[US-010:AC1][BR-NUM-01] should reject scores that are not integer half-point units', () => {
    const scoring = { ...aRuleSet().scoring, draw: 0.5 };

    expect(ruleSetSchema.safeParse(aRuleSet({ scoring })).success).toBe(false);
  });

  it('[US-010:AC1] should reject unknown keys, unknown tie-breaks and malformed keys', () => {
    expect(ruleSetSchema.safeParse({ ...aRuleSet(), surprise: true }).success).toBe(false);
    expect(ruleSetSchema.safeParse({ ...aRuleSet(), tiebreaks: [{ id: 'MADE_UP' }] }).success).toBe(false);
    expect(ruleSetSchema.safeParse(aRuleSet({ key: 'Not Kebab' })).success).toBe(false);
  });

  it('[US-010:AC1] should cover every block of the RuleSet', () => {
    const shape = Object.keys(ruleSetSchema.shape);

    for (const block of [
      'format',
      'system',
      'roundsPolicy',
      'scoring',
      'swiss',
      'tiebreaks',
      'tiebreakPolicy',
      'team',
      'eligibility',
      'timeControl',
      'rating',
    ]) {
      expect(shape, block).toContain(block);
    }
  });

  it('[US-010:AC6] should export the JSON Schema used as documentation', async () => {
    const schema = ruleSetJsonSchema();

    expect(schema['type']).toBe('object');
    await expect(`${JSON.stringify(schema, null, 2)}\n`).toMatchFileSnapshot('../schema/ruleset.schema.json');
  });
});
