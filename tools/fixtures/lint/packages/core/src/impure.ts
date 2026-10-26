// Must fail: clock, randomness and environment in the domain (CLAUDE.md rule 2).
export const stamp = (): number => Date.now();
export const today = (): Date => new Date();
export const roll = (): number => Math.random();
export const env = (): string | undefined => process.env['MODE'];
