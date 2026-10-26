import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { canonicalJson, hashCanonical } from './canonical.js';

/** Test hasher (FNV-1a, 32 bits). The real SHA-256 is injected by the API and the web app (US-021:AC2). */
const testHash = (text: string): string => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193) >>> 0;
  return hash.toString(16).padStart(8, '0');
};

/** Rebuilds a JSON value with every object's keys inserted in reverse order. */
function reverseKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reverseKeys);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .reverse()
        .map(([k, v]) => [k, reverseKeys(v)]),
    );
  }
  return value;
}

describe('canonical serialization (BR-PAIR-13)', () => {
  it('[US-021:AC2][TC-004][BR-PAIR-13] should give the same text and hash whatever the key order', () => {
    fc.assert(
      fc.property(fc.jsonValue(), (value) => {
        const reordered = reverseKeys(value);

        expect(canonicalJson(reordered)).toBe(canonicalJson(value));
        expect(hashCanonical(reordered, testHash)).toBe(hashCanonical(value, testHash));
      }),
    );
  });

  it('[US-021:AC2][TC-004] should parse back to the same value', () => {
    fc.assert(
      fc.property(fc.jsonValue(), (value) => {
        expect(JSON.parse(canonicalJson(value))).toEqual(JSON.parse(JSON.stringify(value)));
      }),
    );
  });

  it('[US-021:AC2] should sort keys by code unit and drop undefined properties', () => {
    expect(canonicalJson({ b: 1, a: { d: undefined, c: [3, 'x'] }, B: true })).toBe(
      '{"B":true,"a":{"c":[3,"x"]},"b":1}',
    );
    expect(canonicalJson(-0)).toBe('0');
  });

  it('[US-021:AC2] should refuse values without a single JSON meaning', () => {
    const bad: readonly unknown[] = [
      Number.NaN,
      Number.POSITIVE_INFINITY,
      [undefined],
      new Map(),
      new Date(0),
      () => 1,
      10n,
    ];
    bad.forEach((value, i) => {
      expect(() => canonicalJson(value), `case ${i}`).toThrow(TypeError);
    });
  });

  it('[US-021:AC2] should hash with the function the environment injects, sync or async', async () => {
    const value = { round: 2, seed: 99 };

    expect(hashCanonical(value, testHash)).toBe(testHash('{"round":2,"seed":99}'));
    await expect(hashCanonical(value, (text) => Promise.resolve(`async:${text}`))).resolves.toBe(
      'async:{"round":2,"seed":99}',
    );
  });
});
