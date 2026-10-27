import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { withTransaction } from '../src/database/transaction.js';
import type { Transaction } from '../src/database/transaction.js';
import { createTestDatabase } from './support/test-database.js';
import type { TestDatabase } from './support/test-database.js';

const ORG = '0190c2a8-7a3b-7c1d-8e2f-3a4b5c6d7e8f';
const USER = '0190c2a8-7a3b-7c1d-9e2f-3a4b5c6d7e90';

let db: TestDatabase;

beforeAll(async () => {
  db = await createTestDatabase();
});

afterAll(async () => {
  await db.dispose();
});

/** The tenant settings as the current transaction sees them. */
async function settings(tx: Transaction) {
  const [row] = await tx.$queryRaw<{ org: string | null; user: string | null }[]>`
    SELECT current_setting('app.organization_id', true) AS org, current_setting('app.user_id', true) AS user`;
  return row;
}

describe('withTransaction', () => {
  it('[US-007:AC3] should set the tenant and the user for that transaction only', async () => {
    const inside = await withTransaction(db.prisma, settings, { organizationId: ORG, userId: USER });
    const next = await withTransaction(db.prisma, settings);

    expect(inside).toEqual({ org: ORG, user: USER });
    // Never inherited from a previous transaction on the same pooled connection.
    expect(next).toEqual({ org: '', user: '' });
  });

  it('[US-007:AC3] should commit what the work wrote and return its result', async () => {
    const id = await withTransaction(db.prisma, async (tx) => {
      const created = await tx.institution.create({ data: { name: 'Universidad Confirmada', city: 'Tunja' } });
      return created.id;
    });

    expect(await db.prisma.institution.count({ where: { id } })).toBe(1);
  });

  it('[US-007:AC3] should roll back everything when the work fails', async () => {
    const failing = withTransaction(db.prisma, async (tx) => {
      await tx.institution.create({ data: { name: 'Universidad Revertida', city: 'Ibagué' } });
      throw new Error('work failed');
    });

    await expect(failing).rejects.toThrow('work failed');
    expect(await db.prisma.institution.count({ where: { name: 'Universidad Revertida' } })).toBe(0);
  });

  it('[US-007:AC3] should reject a tenant that is not a UUID before touching the database', async () => {
    await expect(withTransaction(db.prisma, settings, { organizationId: "x', true); --" })).rejects.toThrow(
      'organizationId must be a UUID',
    );
  });
});

describe('raw SQL', () => {
  it('[US-007:AC6] should send every interpolated value as a parameter, never as SQL', async () => {
    const hostile = "x'; CREATE TABLE injected (id int); --";

    const rows = await withTransaction(
      db.prisma,
      (tx) => tx.$queryRaw<{ name: string }[]>`SELECT name FROM institutions WHERE name = ${hostile}`,
    );
    const [table] = await db.prisma.$queryRaw<
      { found: string | null }[]
    >`SELECT to_regclass('injected')::text AS found`;

    expect(rows).toEqual([]);
    expect(table?.found).toBeNull();
  });
});
