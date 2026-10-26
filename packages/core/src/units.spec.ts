import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { formatUnits, HALF_POINT_DIVISOR, halfPoints, parseUnits, QUARTER_POINT_DIVISOR } from './units.js';

const DIVISORS = [1, HALF_POINT_DIVISOR, QUARTER_POINT_DIVISOR] as const;

describe('integer score units (BR-NUM-01, BR-NUM-02)', () => {
  it('[US-011:AC2][TC-001][BR-NUM-01] should round-trip any integer through its display text', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1_000_000, max: 1_000_000 }),
        fc.constantFrom(...DIVISORS),
        fc.boolean(),
        (units, divisor, unicode) => {
          const text = formatUnits(units, divisor, { fractions: unicode ? 'unicode' : 'decimal' });
          const parsed = parseUnits(text, divisor);

          expect(parsed).toEqual({ ok: true, value: units });
        },
      ),
    );
  });

  it('[US-011:AC2][BR-NUM-01] should show half points with the ½ sign and quarters with ¼ and ¾', () => {
    expect(formatUnits(5, HALF_POINT_DIVISOR)).toBe('2½');
    expect(formatUnits(1, HALF_POINT_DIVISOR)).toBe('½');
    expect(formatUnits(4, HALF_POINT_DIVISOR)).toBe('2');
    expect(formatUnits(0, HALF_POINT_DIVISOR)).toBe('0');
    expect(formatUnits(9, QUARTER_POINT_DIVISOR)).toBe('2¼');
    expect(formatUnits(3, QUARTER_POINT_DIVISOR)).toBe('¾');
    expect(formatUnits(-3, HALF_POINT_DIVISOR)).toBe('-1½');
    expect(formatUnits(5, HALF_POINT_DIVISOR, { fractions: 'decimal' })).toBe('2.5');
    expect(formatUnits(5, HALF_POINT_DIVISOR, { fractions: 'decimal', decimalSeparator: ',' })).toBe('2,5');
  });

  it('[US-011:AC2][BR-NUM-01] should parse Spanish and English decimal notation and reject values the scale cannot hold', () => {
    expect(parseUnits('2,5', HALF_POINT_DIVISOR)).toEqual({ ok: true, value: 5 });
    expect(parseUnits(' 3½ ', HALF_POINT_DIVISOR)).toEqual({ ok: true, value: 7 });
    expect(parseUnits('0.75', QUARTER_POINT_DIVISOR)).toEqual({ ok: true, value: 3 });

    for (const text of ['2.3', '1¼', 'abc', '', '1.5.5', '½½']) {
      const parsed = parseUnits(text, HALF_POINT_DIVISOR);
      expect(parsed.ok, text).toBe(false);
      if (!parsed.ok) expect(parsed.error.code).toBe('INVALID_SCORE_TEXT');
    }
  });

  it('[US-011:AC2] should refuse divisors whose decimal expansion does not terminate', () => {
    expect(() => formatUnits(1, 3)).toThrow(RangeError);
  });

  it('[US-011:AC2][BR-NUM-01] should only build half points from safe integers', () => {
    expect(halfPoints(3)).toBe(3);
    expect(() => halfPoints(1.5)).toThrow(RangeError);
    expect(() => halfPoints(Number.MAX_SAFE_INTEGER + 1)).toThrow(RangeError);
  });
});
