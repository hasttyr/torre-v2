import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { ClsService } from 'nestjs-cls';
import { afterAll, beforeAll, describe, expect, inject, it, vi } from 'vitest';
import { stubExampleEnv } from '../src/__tests__/env.js';
import { AppModule } from '../src/app.module.js';
import { APP_OPTIONS, configureApp } from '../src/app.setup.js';
import { PRINCIPAL_KEY, TenantContext } from '../src/common/request-context.js';
import { DatabaseService } from '../src/database/database.service.js';
import { withTransaction } from '../src/database/transaction.js';
import { createTestDatabase } from './support/test-database.js';
import type { TestDatabase } from './support/test-database.js';

let db: TestDatabase;
let app: INestApplication;

// Tables with organization_id whose policies arrive in a later part of US-025.
// TODO(US-025): audit_log gets its policies in US-025c.
const PENDING = ['audit_log'];

beforeAll(async () => {
  db = await createTestDatabase();
  stubExampleEnv({ DATABASE_URL: db.appUrl, REDIS_URL: inject('redis').url, LOG_LEVEL: 'silent' });
  const moduleRef = await Test.createTestingModule({
    imports: [await AppModule.forRoot({ ignoreEnvFile: true, prefix: `torre-test-${randomUUID()}` })],
  }).compile();
  app = configureApp(moduleRef.createNestApplication<NestExpressApplication>(APP_OPTIONS));
  await app.init();
});

afterAll(async () => {
  await app.close();
  await db.dispose();
  vi.unstubAllEnvs();
});

const systemRole = async (key: string) =>
  (await db.admin.role.findFirstOrThrow({ where: { key, organizationId: null } })).id;

/** Two tenants with a member each, written as a superuser (no policy applies to it). */
async function twoTenants() {
  const [a, b] = [randomUUID(), randomUUID()];
  const users = [randomUUID(), randomUUID()];
  await db.admin.user.createMany({
    data: users.map((id) => ({
      id,
      email: `${id}@example.org`,
      displayName: 'Ana',
      passwordHash: 'x',
      privacyPolicyVersion: '2026-10-27',
      privacyAcceptedAt: new Date(),
    })),
  });
  const owner = await systemRole('org_owner');
  await db.admin.$transaction(async (tx) => {
    for (const [i, org] of [a, b].entries()) {
      await tx.organization.create({ data: { id: org, name: `Org ${i}`, slug: `tenant-${org.slice(0, 8)}` } });
      await tx.membership.create({
        data: {
          userId: users[i] ?? '',
          organizationId: org,
          scopeType: 'ORGANIZATION',
          scopeId: org,
          roleId: owner,
          source: 'DIRECT',
        },
      });
      await tx.role.create({
        data: {
          organizationId: org,
          key: `own_role_${i}`,
          name: 'Rol propio',
          scopeType: 'TOURNAMENT',
          isSystem: false,
        },
      });
    }
  });
  return { a, b, userA: users[0] ?? '', userB: users[1] ?? '' };
}

describe('Row-Level Security (US-025)', () => {
  it('[US-025:AC1][INV-T-1][TC-034] should force a tenant policy on every table with organization_id', async () => {
    const tables = await db.admin.$queryRaw<{ table: string; enabled: boolean; forced: boolean; policies: string[] }[]>`
      SELECT c.relname AS "table", c.relrowsecurity AS enabled, c.relforcerowsecurity AS forced,
             COALESCE(array_agg(p.qual) FILTER (WHERE p.qual IS NOT NULL), '{}') AS policies
      FROM information_schema.columns col
      JOIN pg_class c ON c.relname = col.table_name AND c.relnamespace = 'public'::regnamespace
      LEFT JOIN pg_policies p ON p.tablename = c.relname AND p.schemaname = 'public'
      WHERE col.table_schema = 'public' AND col.column_name = 'organization_id'
      GROUP BY c.relname, c.relrowsecurity, c.relforcerowsecurity
      ORDER BY 1`;

    expect(tables.map((t) => t.table)).toEqual(expect.arrayContaining(['memberships', 'roles', ...PENDING]));
    for (const t of tables.filter((x) => !PENDING.includes(x.table))) {
      expect([t.table, t.enabled, t.forced]).toEqual([t.table, true, true]);
      expect(
        t.policies.some((q) => q.includes('app_current_organization()')),
        t.table,
      ).toBe(true);
    }
  });

  it('[US-025:AC2] should keep the application role away from owning tables or bypassing RLS', async () => {
    const [role] = await db.admin.$queryRaw<{ bypass: boolean; superuser: boolean }[]>`
      SELECT rolbypassrls AS bypass, rolsuper AS superuser FROM pg_roles WHERE rolname = 'torre_app'`;
    const owned = await db.admin.$queryRaw<{ n: bigint }[]>`
      SELECT count(*) AS n FROM pg_tables WHERE schemaname = 'public' AND tableowner = 'torre_app'`;

    expect(role).toEqual({ bypass: false, superuser: false });
    expect(Number(owned[0]?.n)).toBe(0);
  });

  it('[US-025:AC4][INV-T-1][TC-034] should show no rows without a tenant, and only its own with one', async () => {
    const { a, b } = await twoTenants();

    // Fail closed: no tenant, no account — not a single row, although both tenants have them.
    expect(await db.prisma.membership.count()).toBe(0);
    expect(await db.prisma.role.count({ where: { isSystem: false } })).toBe(0);
    await withTransaction(db.prisma, async (tx) => {
      expect(await tx.membership.count()).toBe(0);
    });

    const inA = await withTransaction(
      db.prisma,
      async (tx) => ({
        memberships: (await tx.membership.findMany()).map((m) => m.organizationId),
        ownRoles: (await tx.role.findMany({ where: { isSystem: false } })).map((r) => r.organizationId),
        systemRoles: await tx.role.count({ where: { isSystem: true } }),
      }),
      { organizationId: a },
    );
    expect(inA).toEqual({ memberships: [a], ownRoles: [a], systemRoles: 7 });
    expect(b).not.toEqual(a);
  });

  it('[US-025:AC4][INV-T-1] should not let one tenant change or add rows of another', async () => {
    const { a, b, userA } = await twoTenants();
    const owner = await systemRole('org_admin');

    const touched = await withTransaction(
      db.prisma,
      (tx) => tx.membership.updateMany({ where: { organizationId: b }, data: { grantReason: 'cambiado desde A' } }),
      { organizationId: a },
    );
    expect(touched.count).toBe(0);
    await expect(
      withTransaction(
        db.prisma,
        (tx) =>
          tx.membership.createMany({
            data: {
              userId: userA,
              organizationId: b,
              scopeType: 'ORGANIZATION',
              scopeId: b,
              roleId: owner,
              source: 'DIRECT',
            },
          }),
        { organizationId: a },
      ),
    ).rejects.toThrow(/row-level security/);
    expect(await db.admin.membership.count({ where: { organizationId: b, grantReason: 'cambiado desde A' } })).toBe(0);
  });

  it('[US-025:AC4] should let an account read its own memberships in every organization, and nobody else’s', async () => {
    const { a, b, userA } = await twoTenants();

    const own = await withTransaction(db.prisma, (tx) => tx.membership.findMany(), { userId: userA });
    expect(own.map((m) => [m.userId, m.organizationId])).toEqual([[userA, a]]);
    expect(own.some((m) => m.organizationId === b)).toBe(false);
  });

  it('[US-025:AC3] should set the account and the tenant of the request at the start of every transaction', async () => {
    const cls = app.get(ClsService);
    const database = app.get(DatabaseService);
    const tenant = app.get(TenantContext);
    const [userId, organizationId] = [randomUUID(), randomUUID()];
    const settings = () =>
      database.withTransaction(async (tx) => {
        const [row] = await tx.$queryRaw<{ user: string; org: string }[]>`
          SELECT current_setting('app.user_id', true) AS "user", current_setting('app.organization_id', true) AS org`;
        return row;
      });

    const seen = await cls.run(async () => {
      cls.set(PRINCIPAL_KEY, { userId, sessionId: randomUUID() });
      const before = await settings();
      tenant.use(organizationId);
      return [before, await settings()];
    });

    expect(seen).toEqual([
      { user: userId, org: '' },
      { user: userId, org: organizationId },
    ]);
    // Outside a request nothing is inherited: a worker or a console passes its context explicitly.
    expect(await settings()).toEqual({ user: '', org: '' });
  });
});
