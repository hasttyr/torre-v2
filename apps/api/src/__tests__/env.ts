import { readFileSync } from 'node:fs';
import { parseEnv as parseDotenv } from 'node:util';
import { vi } from 'vitest';

/** The variables of `.env.example`, the documented local configuration. */
export const exampleEnv = (): Record<string, string> => {
  const parsed = parseDotenv(readFileSync(new URL('../../../../.env.example', import.meta.url), 'utf8'));
  return Object.fromEntries(Object.entries(parsed).filter((e): e is [string, string] => e[1] !== undefined));
};

/** Puts `.env.example` (plus overrides) in `process.env`; undo with `vi.unstubAllEnvs()`. */
export const stubExampleEnv = (overrides: Record<string, string> = {}): void => {
  for (const [key, value] of Object.entries({ ...exampleEnv(), ...overrides })) vi.stubEnv(key, value);
};
