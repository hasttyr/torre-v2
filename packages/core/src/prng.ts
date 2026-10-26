/**
 * Seeded pseudo-random numbers for draws (BR-GEN-01, BR-TIE-05, C.04.3 Art. 5.1). Not cryptographic.
 *
 * Algorithm: xoshiro128** 1.1 (Blackman and Vigna, https://prng.di.unimi.it/xoshiro128starstar.c),
 * its 128-bit state filled from the seed by SplitMix64 (https://prng.di.unimi.it/splitmix64.c), as the
 * authors recommend. Only 32-bit integer operations (`Math.imul`, `>>>`) and BigInt are used, whose
 * results the language specification fixes, so Node and browsers produce the same sequence.
 */

const rotl = (x: number, k: number): number => ((x << k) | (x >>> (32 - k))) >>> 0;

/** SplitMix64 over a 64-bit unsigned state. */
export function splitMix64(seed: bigint): () => bigint {
  let state = BigInt.asUintN(64, seed);
  return () => {
    state = BigInt.asUintN(64, state + 0x9e3779b97f4a7c15n);
    let z = state;
    z = BigInt.asUintN(64, (z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n);
    z = BigInt.asUintN(64, (z ^ (z >> 27n)) * 0x94d049bb133111ebn);
    return z ^ (z >> 31n);
  };
}

/** xoshiro128** over an explicit state of four unsigned 32-bit words (not all zero). */
export function xoshiro128StarStar(state: readonly [number, number, number, number]): () => number {
  let [s0, s1, s2, s3] = state.map((word) => word >>> 0) as [number, number, number, number];
  if ((s0 | s1 | s2 | s3) === 0) throw new RangeError('xoshiro128** state must not be all zero');
  return () => {
    const result = Math.imul(rotl(Math.imul(s1, 5) >>> 0, 7), 9) >>> 0;
    const t = (s1 << 9) >>> 0;
    s2 = (s2 ^ s0) >>> 0;
    s3 = (s3 ^ s1) >>> 0;
    s1 = (s1 ^ s2) >>> 0;
    s0 = (s0 ^ s3) >>> 0;
    s2 = (s2 ^ t) >>> 0;
    s3 = rotl(s3, 11);
    return result;
  };
}

export interface Prng {
  /** Uniform unsigned 32-bit integer. */
  nextUint32(): number;
  /** Uniform number in [0, 1), with 32 bits of resolution. */
  nextFloat(): number;
  /** Uniform integer in [0, maxExclusive), without modulo bias. */
  nextInt(maxExclusive: number): number;
}

const TWO_POW_32 = 2 ** 32;
const LOW_32 = (1n << 32n) - 1n;

/** A generator for a non-negative safe-integer seed; the seed is what the event stores (BR-GEN-01). */
export function createPrng(seed: number): Prng {
  if (!Number.isSafeInteger(seed) || seed < 0)
    throw new RangeError(`seed must be a non-negative safe integer, got ${seed}`);
  const seeder = splitMix64(BigInt(seed));
  const a = seeder();
  const b = seeder();
  const next = xoshiro128StarStar([Number(a & LOW_32), Number(a >> 32n), Number(b & LOW_32), Number(b >> 32n)]);
  const nextInt = (maxExclusive: number): number => {
    if (!Number.isInteger(maxExclusive) || maxExclusive < 1 || maxExclusive > TWO_POW_32) {
      throw new RangeError(`maxExclusive must be an integer in [1, 2^32], got ${maxExclusive}`);
    }
    // Rejection sampling: discard the top values that would make some results more likely.
    const limit = TWO_POW_32 - (TWO_POW_32 % maxExclusive);
    let value = next();
    while (value >= limit) value = next();
    return value % maxExclusive;
  };
  return { nextUint32: next, nextFloat: () => next() / TWO_POW_32, nextInt };
}

/** Fisher–Yates shuffle into a new array; the input is not modified. */
export function shuffle<T>(items: readonly T[], prng: Prng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = prng.nextInt(i + 1);
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

/** One element of a non-empty list. */
export function pick<T>(items: readonly T[], prng: Prng): T {
  if (items.length === 0) throw new RangeError('cannot pick from an empty list');
  return items[prng.nextInt(items.length)] as T;
}

/**
 * Orders tied candidates by lot (BR-TIE-05). Candidates are first sorted by their unique key, so the
 * result depends only on the seed and the candidates, never on the order they arrived in.
 */
export function drawLots<T>(items: readonly T[], prng: Prng, keyOf: (item: T) => string): T[] {
  const sorted = [...items].sort((x, y) => {
    const [kx, ky] = [keyOf(x), keyOf(y)];
    return kx < ky ? -1 : kx > ky ? 1 : 0;
  });
  return shuffle(sorted, prng);
}
