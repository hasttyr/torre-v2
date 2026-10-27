import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DEMO_INSTITUTIONS, seed } from '../src/database/seed.js';
import { createTestDatabase } from './support/test-database.js';
import type { TestDatabase } from './support/test-database.js';

let db: TestDatabase;

beforeAll(async () => {
  db = await createTestDatabase();
});

afterAll(async () => {
  await db.dispose();
});

describe('development seed', () => {
  it('[US-007:AC4] should be idempotent: a second run creates nothing and changes nothing', async () => {
    const first = await seed(db.prisma);
    const afterFirst = await db.prisma.institution.findMany({ orderBy: { id: 'asc' } });
    const second = await seed(db.prisma);
    const afterSecond = await db.prisma.institution.findMany({ orderBy: { id: 'asc' } });

    expect(first.institutions).toEqual({ created: DEMO_INSTITUTIONS.length, existing: 0 });
    expect(second.institutions).toEqual({ created: 0, existing: DEMO_INSTITUTIONS.length });
    expect(afterSecond).toEqual(afterFirst);
  });

  it('[US-007:AC4] should keep a demo row edited by hand and only restore the missing ones', async () => {
    const [edited] = DEMO_INSTITUTIONS;
    await db.prisma.institution.update({ where: { id: edited.id }, data: { city: 'Chía' } });

    const report = await seed(db.prisma);

    expect(report.institutions.created).toBe(0);
    expect((await db.prisma.institution.findUniqueOrThrow({ where: { id: edited.id } })).city).toBe('Chía');
  });
});
