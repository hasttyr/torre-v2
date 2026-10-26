import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createPrng, drawLots, pick, shuffle, splitMix64, xoshiro128StarStar } from './prng.js';

describe('seeded PRNG (BR-GEN-01)', () => {
  it('[US-021:AC1][US-021:AC3][TC-003] should reproduce the reference outputs of xoshiro128** for state {1, 2, 3, 4}', () => {
    // Reference vector of the C implementation by Blackman and Vigna (also used by rand_xoshiro).
    const next = xoshiro128StarStar([1, 2, 3, 4]);
    const outputs = Array.from({ length: 10 }, () => next());

    expect(outputs).toEqual([
      11520, 0, 5927040, 70819200, 2031721883, 1637235492, 1287239034, 3734860849, 3729100597, 4258142804,
    ]);
  });

  it('[US-021:AC1][US-021:AC3][TC-003] should reproduce the reference outputs of SplitMix64 for seed 1234567', () => {
    const next = splitMix64(1234567n);
    const outputs = Array.from({ length: 5 }, () => next());

    expect(outputs).toEqual([
      6457827717110365317n,
      3203168211198807973n,
      9817491932198370423n,
      4593380528125082431n,
      16408922859458223821n,
    ]);
  });

  it('[US-021:AC1][US-021:AC3][TC-003] should give the same sequence for the same seed and a different one for another seed', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }), (seed) => {
        const a = createPrng(seed);
        const b = createPrng(seed);
        const c = createPrng(seed + 1);
        const take = (p: ReturnType<typeof createPrng>) => Array.from({ length: 8 }, () => p.nextUint32());

        const first = take(a);
        expect(take(b)).toEqual(first);
        expect(take(c)).not.toEqual(first);
      }),
    );
  });

  it('[US-021:AC1] should draw integers uniformly enough for lots and colours (sanity, not cryptographic)', () => {
    const prng = createPrng(20261026);
    const counts = new Array<number>(10).fill(0);
    const draws = 100_000;
    for (let i = 0; i < draws; i++) {
      const value = prng.nextInt(10);
      counts[value] = (counts[value] ?? 0) + 1;
    }

    for (const count of counts) expect(Math.abs(count - draws / 10)).toBeLessThan((draws / 10) * 0.05);
    expect(Math.min(...Array.from({ length: 1000 }, () => prng.nextFloat()))).toBeGreaterThanOrEqual(0);
    expect(Math.max(...Array.from({ length: 1000 }, () => prng.nextFloat()))).toBeLessThan(1);
  });

  it('[US-021:AC1] should reject invalid seeds and bounds', () => {
    expect(() => createPrng(-1)).toThrow(RangeError);
    expect(() => createPrng(1.5)).toThrow(RangeError);
    expect(() => createPrng(1).nextInt(0)).toThrow(RangeError);
    expect(() => createPrng(1).nextInt(2 ** 32 + 1)).toThrow(RangeError);
  });
});

describe('shuffle, pick and drawLots', () => {
  it('[US-021:AC1] should shuffle into a permutation, reproducibly, without touching the input', () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), fc.nat(), (items, seed) => {
        const input = Object.freeze([...items]);
        const once = shuffle(input, createPrng(seed));

        expect([...once].sort((a, b) => a - b)).toEqual([...items].sort((a, b) => a - b));
        expect(shuffle(input, createPrng(seed))).toEqual(once);
        expect(input).toEqual(items);
      }),
    );
  });

  it('[US-021:AC1] should reach every permutation of three items about equally often', () => {
    const prng = createPrng(7);
    const counts = new Map<string, number>();
    const draws = 60_000;
    for (let i = 0; i < draws; i++) {
      const key = shuffle(['a', 'b', 'c'], prng).join('');
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    expect(counts.size).toBe(6);
    for (const count of counts.values()) expect(Math.abs(count - draws / 6)).toBeLessThan((draws / 6) * 0.05);
  });

  it('[US-021:AC1][BR-TIE-05] should draw lots independently of the order the candidates arrive in', () => {
    fc.assert(
      fc.property(fc.uniqueArray(fc.string({ minLength: 1 })), fc.nat(), fc.nat(), (ids, seed, rotation) => {
        const rotated = ids.map((_, i) => ids[(i + rotation) % ids.length] as string);

        expect(drawLots(rotated, createPrng(seed), (id) => id)).toEqual(drawLots(ids, createPrng(seed), (id) => id));
      }),
    );
  });

  it('[US-021:AC1] should pick an element of a non-empty list and refuse an empty one', () => {
    const prng = createPrng(3);

    expect(['WHITE', 'BLACK']).toContain(pick(['WHITE', 'BLACK'] as const, prng));
    expect(() => pick([], prng)).toThrow(RangeError);
  });
});
