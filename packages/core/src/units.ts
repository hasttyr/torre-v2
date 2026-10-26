import type { Brand } from './ids.js';
import { DomainError, err, ok } from './result.js';
import type { Result } from './result.js';

/**
 * Scores are stored as integers (BR-NUM-01): 1 point = 2 half-point units. Some tie-breaks multiply two
 * half-point values and use quarter points (BR-NUM-02). The decimal value exists only for display.
 */
export type HalfPoints = Brand<number, 'HalfPoints'>;

export const HALF_POINT_DIVISOR = 2;
export const QUARTER_POINT_DIVISOR = 4;

/** Builds half points from an integer; a fraction here is a programming error. */
export function halfPoints(units: number): HalfPoints {
  if (!Number.isSafeInteger(units)) throw new RangeError(`half points must be a safe integer, got ${units}`);
  return units as HalfPoints;
}

const UNICODE_FRACTIONS: Readonly<Record<string, string>> = { '1/2': '½', '1/4': '¼', '3/4': '¾' };
const FRACTION_VALUES: Readonly<Record<string, readonly [number, number]>> = { '½': [1, 2], '¼': [1, 4], '¾': [3, 4] };

export interface FormatOptions {
  /** `unicode` writes ½, ¼ and ¾ where they apply; `decimal` writes 2.5 */
  readonly fractions?: 'unicode' | 'decimal';
  readonly decimalSeparator?: '.' | ',';
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

/** Writes integer units as a human score: `formatUnits(5, 2)` is "2½". */
export function formatUnits(units: number, divisor: number, options: FormatOptions = {}): string {
  if (!Number.isInteger(Math.log2(divisor))) throw new RangeError(`divisor must be a power of two, got ${divisor}`);
  const { fractions = 'unicode', decimalSeparator = '.' } = options;
  const sign = units < 0 ? '-' : '';
  const abs = Math.abs(units);
  const whole = Math.trunc(abs / divisor);
  const rest = abs % divisor;
  if (rest === 0) return `${sign}${whole}`;
  const g = gcd(rest, divisor);
  const glyph = UNICODE_FRACTIONS[`${rest / g}/${divisor / g}`];
  if (fractions === 'unicode' && glyph !== undefined) return `${sign}${whole === 0 ? '' : whole}${glyph}`;
  // Exact decimal: divisors used for scores are powers of two, so the expansion terminates.
  const decimals = Math.log2(divisor);
  const digits = String((rest * 10 ** decimals) / divisor)
    .padStart(decimals, '0')
    .replace(/0+$/, '');
  return `${sign}${whole}${decimalSeparator}${digits}`;
}

type ParseError = DomainError<'INVALID_SCORE_TEXT'>;

/** Reads "2½", "2.5" or "2,5" back into integer units; rejects values the scale cannot represent. */
export function parseUnits(text: string, divisor: number): Result<number, ParseError> {
  const invalid = err(new DomainError('INVALID_SCORE_TEXT', { text, divisor }));
  const trimmed = text.trim();
  const match = /^(-)?(\d*)(?:([.,])(\d+))?([½¼¾])?$/.exec(trimmed);
  if (!match || trimmed === '' || trimmed === '-') return invalid;
  const [, minus, wholeText = '', separator, fractionText, glyph] = match;
  if (
    (separator !== undefined && glyph !== undefined) ||
    (wholeText === '' && separator === undefined && glyph === undefined)
  ) {
    return invalid;
  }
  const whole = wholeText === '' ? 0 : Number(wholeText);
  let numerator = 0;
  let denominator = 1;
  if (glyph !== undefined) {
    const fraction = FRACTION_VALUES[glyph];
    if (fraction === undefined) return invalid;
    [numerator, denominator] = fraction;
  } else if (fractionText !== undefined) {
    numerator = Number(fractionText);
    denominator = 10 ** fractionText.length;
  }
  // units = (whole + numerator/denominator) * divisor, which must be an integer.
  const scaled = numerator * divisor;
  if (scaled % denominator !== 0) return invalid;
  const units = whole * divisor + scaled / denominator;
  if (!Number.isSafeInteger(units)) return invalid;
  return ok(minus === undefined ? units : -units);
}
