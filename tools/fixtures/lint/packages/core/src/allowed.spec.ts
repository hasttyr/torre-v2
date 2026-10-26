// Must pass: tests may use `!`, the clock and randomness.
export const firstOrFail = (items: readonly number[]): number => items[0]!;
export const seedFromClock = (): number => Date.now() + Math.random();
