import type { PrismaClient } from './prisma.js';
import { withTransaction } from './transaction.js';

/**
 * Development data (US-007:AC4). Fixed ids make the seed idempotent: a second run finds every row and
 * changes nothing, not even a row edited by hand since. Names say "Demo" so nobody mistakes them for
 * real universities (CONVENTIONS.md §9); they carry no SNIES code because none is real.
 */
export const DEMO_INSTITUTIONS = [
  { id: '01900000-0000-7000-8000-000000000001', name: 'Universidad Demo Andina', city: 'Bogotá' },
  { id: '01900000-0000-7000-8000-000000000002', name: 'Universidad Demo del Pacífico', city: 'Cali' },
  { id: '01900000-0000-7000-8000-000000000003', name: 'Universidad Demo del Caribe', city: 'Barranquilla' },
  { id: '01900000-0000-7000-8000-000000000004', name: 'Universidad Demo de Antioquia', city: 'Medellín' },
  { id: '01900000-0000-7000-8000-000000000005', name: 'Universidad Demo del Oriente', city: 'Bucaramanga' },
  { id: '01900000-0000-7000-8000-000000000006', name: 'Universidad Demo del Eje', city: 'Manizales' },
] as const;

export interface SeedReport {
  readonly institutions: { readonly created: number; readonly existing: number };
}

/** Seeds are for local machines only: they refuse to run against production. */
export function assertSeedAllowed(nodeEnv: string): void {
  if (nodeEnv === 'production') throw new Error('The development seed never runs with NODE_ENV=production');
}

/** Inserts the demo rows that are missing, in one transaction, as the application role. */
export async function seed(client: PrismaClient): Promise<SeedReport> {
  return withTransaction(client, async (tx) => {
    const ids = DEMO_INSTITUTIONS.map((i) => i.id);
    const found = await tx.institution.findMany({ where: { id: { in: ids } }, select: { id: true } });
    const existing = new Set(found.map((row) => row.id));
    const missing = DEMO_INSTITUTIONS.filter((i) => !existing.has(i.id));
    if (missing.length > 0) await tx.institution.createMany({ data: [...missing] });
    return { institutions: { created: missing.length, existing: existing.size } };
  });
}
