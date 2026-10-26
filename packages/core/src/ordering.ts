import type { Competitor } from './model.js';

/**
 * Canonical order of competitors (BR-GEN-01, BR-REG-04): by seed, then by id. Ids are compared by
 * code units, never by locale, so the order is the same on every machine.
 */
export function compareCompetitors(a: Pick<Competitor, 'id' | 'seed'>, b: Pick<Competitor, 'id' | 'seed'>): number {
  if (a.seed !== b.seed) return a.seed - b.seed;
  if (a.id === b.id) return 0;
  return a.id < b.id ? -1 : 1;
}

/** Returns a new array in canonical order; the input is not modified. */
export function sortCompetitors<C extends Pick<Competitor, 'id' | 'seed'>>(competitors: readonly C[]): C[] {
  return [...competitors].sort(compareCompetitors);
}
