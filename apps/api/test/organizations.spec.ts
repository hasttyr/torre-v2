import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { PRIVACY_POLICY_VERSION, ROLE_SCOPES } from '@torre/contracts';
import type { RoleKey } from '@torre/contracts';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, inject, it, vi } from 'vitest';
import { stubExampleEnv } from '../src/__tests__/env.js';
import { AppModule } from '../src/app.module.js';
import { APP_OPTIONS, configureApp } from '../src/app.setup.js';
import { withTransaction } from '../src/database/transaction.js';
import type { Transaction } from '../src/database/transaction.js';
import { createTestDatabase } from './support/test-database.js';
import type { TestDatabase } from './support/test-database.js';

let db: TestDatabase;
let app: INestApplication;
let http: ReturnType<typeof request>;

const PASSWORD = 'una frase larga que nadie adivina';

beforeAll(async () => {
  db = await createTestDatabase();
  stubExampleEnv({
    DATABASE_URL: db.appUrl,
    REDIS_URL: inject('redis').url,
    LOG_LEVEL: 'silent',
    // Every request of this suite comes from one address; the limits have their own suite (auth-limits).
    AUTH_THROTTLE_LIMIT: '1000',
  });
  const moduleRef = await Test.createTestingModule({
    imports: [await AppModule.forRoot({ ignoreEnvFile: true, prefix: `torre-test-${randomUUID()}` })],
  }).compile();
  app = configureApp(moduleRef.createNestApplication<NestExpressApplication>(APP_OPTIONS));
  await app.init();
  http = request(app.getHttpServer() as Server);
});

afterAll(async () => {
  await app.close();
  await db.dispose();
  vi.unstubAllEnvs();
});

interface Account {
  readonly id: string;
  readonly token: string;
}

/** A new viewer account, signed in: no memberships (BR-ROLE-01). */
async function account(email: string): Promise<Account> {
  const registered = await http.post('/api/v1/auth/register').send({
    email,
    password: PASSWORD,
    displayName: 'Ana Pérez',
    locale: 'es',
    acceptedPrivacyPolicyVersion: PRIVACY_POLICY_VERSION,
  });
  expect(registered.status).toBe(201);
  const login = await http.post('/api/v1/auth/login').send({ email, password: PASSWORD });
  expect(login.status).toBe(200);
  return { id: (registered.body as { id: string }).id, token: (login.body as { accessToken: string }).accessToken };
}

const roleId = async (key: RoleKey) =>
  (await db.prisma.role.findFirstOrThrow({ where: { key, organizationId: null } })).id;

/** What the console command of US-028 will do: the bootstrap platform_admin membership (BR-ROLE-01). */
async function platformAdmin(email: string): Promise<Account> {
  const admin = await account(email);
  await db.admin.membership.create({
    data: { userId: admin.id, scopeType: 'PLATFORM', roleId: await roleId('platform_admin'), source: 'BOOTSTRAP' },
  });
  return admin;
}

const createOrganization = (as: Account, body: { name: string; slug: string }) =>
  http.post('/api/v1/organizations').set('authorization', `Bearer ${as.token}`).send(body);

async function organization(as: Account, slug: string): Promise<string> {
  const res = await createOrganization(as, { name: `Organización ${slug}`, slug });
  expect(res.status).toBe(201);
  return (res.body as { id: string }).id;
}

/** A membership granted straight in the database, as US-028 will do through the API. */
async function grant(userId: string, role: RoleKey, organizationId: string, scopeId = organizationId) {
  return db.admin.membership.create({
    data: {
      userId,
      organizationId,
      scopeType: ROLE_SCOPES[role],
      scopeId,
      roleId: await roleId(role),
      source: 'DIRECT',
    },
  });
}

const liveOwners = (organizationId: string) =>
  db.admin.membership.count({
    where: { organizationId, revokedAt: null, role: { key: 'org_owner', organizationId: null } },
  });

const revoke = (membershipId: string) =>
  db.admin.membership.update({ where: { id: membershipId }, data: { revokedAt: new Date() } });

const ownerMembership = (organizationId: string, userId: string) =>
  db.admin.membership.findFirstOrThrow({
    where: { organizationId, userId, revokedAt: null, role: { key: 'org_owner', organizationId: null } },
  });

describe('creating an organization (US-023)', () => {
  it('[US-023:AC2][TC-047] should let a platform_admin create an organization and become its org_owner', async () => {
    const admin = await platformAdmin('org-create@example.org');
    const res = await createOrganization(admin, { name: '  Liga Universitaria de Antioquia ', slug: 'liga-antioquia' });

    expect(res.status).toBe(201);
    const created = res.body as { id: string; name: string; slug: string };
    expect(Object.keys(created).sort()).toEqual(['id', 'name', 'slug']);
    expect(created).toMatchObject({ name: 'Liga Universitaria de Antioquia', slug: 'liga-antioquia' });
    const owner = await ownerMembership(created.id, admin.id);
    expect(owner).toMatchObject({
      scopeType: 'ORGANIZATION',
      scopeId: created.id,
      source: 'CREATOR',
      grantedBy: admin.id,
      revokedAt: null,
    });
    // Both rows share the time of their transaction, so they are sorted by action.
    const trail = await db.prisma.auditLog.findMany({
      where: { organizationId: created.id },
      orderBy: { action: 'asc' },
    });
    expect(trail).toMatchObject([
      { action: 'membership.granted', actorUserId: admin.id, targetType: 'membership', targetId: owner.id },
      { action: 'organization.created', actorUserId: admin.id, targetType: 'organization', targetId: created.id },
    ]);
  });

  it('[US-023:AC2][TC-047] should refuse any other account with 403 and write nothing, even the owner of another organization', async () => {
    const admin = await platformAdmin('org-forbid-admin@example.org');
    const viewer = await account('org-forbid-viewer@example.org');
    const owner = await account('org-forbid-owner@example.org');
    const theirs = await organization(admin, 'forbid-theirs');
    await grant(owner.id, 'org_owner', theirs);
    const before = await db.prisma.organization.count();

    for (const who of [viewer, owner]) {
      const res = await createOrganization(who, { name: 'Club sin permiso', slug: 'club-sin-permiso' });
      expect(res.status).toBe(403);
      expect(res.body).toMatchObject({ code: 'FORBIDDEN' });
    }
    expect(await db.prisma.organization.count()).toBe(before);
    expect(await db.prisma.auditLog.count({ where: { action: 'organization.created', actorUserId: owner.id } })).toBe(
      0,
    );
  });

  it('[US-023:AC2] should refuse an anonymous request with 401', async () => {
    const res = await http.post('/api/v1/organizations').send({ name: 'Anónima', slug: 'anonima' });

    expect(res.status).toBe(401);
  });

  it('[US-023:AC1][US-023:AC2] should answer VALIDATION_FAILED on the slug when it is taken or malformed', async () => {
    const admin = await platformAdmin('org-slug@example.org');
    await organization(admin, 'slug-unico');

    const taken = await createOrganization(admin, { name: 'Otra', slug: 'slug-unico' });
    expect(taken.status).toBe(400);
    expect(taken.body).toMatchObject({ code: 'VALIDATION_FAILED', errors: [{ path: 'slug', code: 'taken' }] });
    for (const slug of ['Mayusculas', 'doble--guion', '-borde', 'ab', 'con espacio']) {
      const res = await createOrganization(admin, { name: 'Mal', slug });
      expect(res.status, slug).toBe(400);
    }
  });
});

describe('the memberships table (US-023)', () => {
  it('[US-023:AC1] should keep one live membership per user, role and scope, and grant it again once revoked', async () => {
    const admin = await platformAdmin('mem-unique-admin@example.org');
    const member = await account('mem-unique@example.org');
    const org = await organization(admin, 'mem-unique');
    const first = await grant(member.id, 'org_admin', org);

    await expect(grant(member.id, 'org_admin', org)).rejects.toMatchObject({ code: 'P2002' });
    await expect(
      db.admin.membership.create({
        data: { userId: admin.id, scopeType: 'PLATFORM', roleId: await roleId('platform_admin'), source: 'BOOTSTRAP' },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
    await revoke(first.id);
    await expect(grant(member.id, 'org_admin', org)).resolves.toMatchObject({ revokedAt: null });
    // Another role in the same scope is another membership (AUTHORIZATION.md §4, notes).
    await expect(grant(member.id, 'org_owner', org)).resolves.toMatchObject({ revokedAt: null });
  });

  it('[US-023:AC1] should refuse memberships whose scope does not fit the role or the organization', async () => {
    const admin = await platformAdmin('mem-scope-admin@example.org');
    const member = await account('mem-scope@example.org');
    const org = await organization(admin, 'mem-scope');
    const attempts = [
      // org_owner is granted in an ORGANIZATION scope, never in a tournament.
      { organizationId: org, scopeType: 'TOURNAMENT', scopeId: randomUUID(), roleId: await roleId('org_owner') },
      // The PLATFORM scope belongs to no organization.
      { organizationId: org, scopeType: 'PLATFORM', scopeId: null, roleId: await roleId('platform_admin') },
      // An ORGANIZATION scope is the organization itself.
      { organizationId: org, scopeType: 'ORGANIZATION', scopeId: randomUUID(), roleId: await roleId('org_admin') },
      // Every other scope lives inside an organization.
      { organizationId: null, scopeType: 'TOURNAMENT', scopeId: randomUUID(), roleId: await roleId('arbiter') },
      { organizationId: org, scopeType: 'GALAXY', scopeId: randomUUID(), roleId: await roleId('arbiter') },
    ];

    for (const attempt of attempts) {
      await expect(
        db.admin.membership.create({ data: { userId: member.id, source: 'DIRECT', ...attempt } }),
        JSON.stringify(attempt),
      ).rejects.toThrow();
    }
    expect(await db.prisma.membership.count({ where: { userId: member.id } })).toBe(0);
    // What the database holds, beyond what the application role may see (US-025).
    expect(await db.admin.membership.count({ where: { userId: member.id } })).toBe(0);
  });

  it('[US-023:AC3] should hold in the database the system roles and scopes of @torre/contracts', async () => {
    const roles = await db.prisma.role.findMany({ where: { isSystem: true }, orderBy: { key: 'asc' } });

    expect(Object.fromEntries(roles.map((r) => [r.key, r.scopeType]))).toEqual(ROLE_SCOPES);
    expect(roles.every((r) => r.organizationId === null)).toBe(true);
  });
});

describe('my organizations and memberships (US-023)', () => {
  it('[US-023:AC4][TC-047] should start a new account with no organizations and no memberships (BR-ROLE-01)', async () => {
    const viewer = await account('mine-empty@example.org');

    const orgs = await http.get('/api/v1/organizations').set('authorization', `Bearer ${viewer.token}`);
    const memberships = await http.get('/api/v1/me/memberships').set('authorization', `Bearer ${viewer.token}`);
    expect([orgs.status, orgs.body]).toEqual([200, []]);
    expect([memberships.status, memberships.body]).toEqual([200, []]);
  });

  it('[US-023:AC4] should list only the organizations and live memberships of the account, in any scope', async () => {
    const admin = await platformAdmin('mine-admin@example.org');
    const member = await account('mine-member@example.org');
    const alpha = await organization(admin, 'mine-alpha');
    const beta = await organization(admin, 'mine-beta');
    await organization(admin, 'mine-gamma');
    const asAdmin = await grant(member.id, 'org_admin', alpha);
    const tournament = randomUUID();
    const asArbiter = await grant(member.id, 'arbiter', beta, tournament);
    const gone = await grant(member.id, 'org_admin', beta);
    await revoke(gone.id);

    const orgs = await http.get('/api/v1/organizations').set('authorization', `Bearer ${member.token}`);
    const memberships = await http.get('/api/v1/me/memberships').set('authorization', `Bearer ${member.token}`);

    expect(orgs.status).toBe(200);
    expect(orgs.body).toEqual([
      { id: alpha, name: 'Organización mine-alpha', slug: 'mine-alpha' },
      { id: beta, name: 'Organización mine-beta', slug: 'mine-beta' },
    ]);
    expect(memberships.status).toBe(200);
    expect(memberships.body).toEqual([
      {
        id: asAdmin.id,
        role: 'org_admin',
        scopeType: 'ORGANIZATION',
        scopeId: alpha,
        organizationId: alpha,
        source: 'DIRECT',
        grantedAt: asAdmin.createdAt.toISOString(),
      },
      {
        id: asArbiter.id,
        role: 'arbiter',
        scopeType: 'TOURNAMENT',
        scopeId: tournament,
        organizationId: beta,
        source: 'DIRECT',
        grantedAt: asArbiter.createdAt.toISOString(),
      },
    ]);
  });

  it('[US-023:AC4] should list the platform membership without an organization or a scope id', async () => {
    const admin = await platformAdmin('mine-platform@example.org');
    const org = await organization(admin, 'mine-platform');

    const res = await http.get('/api/v1/me/memberships').set('authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject([
      { role: 'platform_admin', scopeType: 'PLATFORM', scopeId: null, organizationId: null, source: 'BOOTSTRAP' },
      { role: 'org_owner', scopeType: 'ORGANIZATION', scopeId: org, organizationId: org, source: 'CREATOR' },
    ]);
  });

  it('[US-023:AC4] should refuse both lists without an access token', async () => {
    expect((await http.get('/api/v1/organizations')).status).toBe(401);
    expect((await http.get('/api/v1/me/memberships')).status).toBe(401);
  });
});

describe('the last org_owner (US-023)', () => {
  it('[US-023:AC5][TC-047] should refuse to revoke the last org_owner or to change their role', async () => {
    const admin = await platformAdmin('last-owner@example.org');
    const org = await organization(admin, 'last-owner');
    const owner = await ownerMembership(org, admin.id);

    await expect(revoke(owner.id)).rejects.toThrow(/without an org_owner/);
    await expect(
      db.admin.membership.update({ where: { id: owner.id }, data: { roleId: await roleId('org_admin') } }),
    ).rejects.toThrow(/without an org_owner/);
    expect(await liveOwners(org)).toBe(1);
  });

  it('[US-023:AC5] should let ownership be handed over in either order within a transaction', async () => {
    const admin = await platformAdmin('handover-admin@example.org');
    const heir = await account('handover-heir@example.org');
    const org = await organization(admin, 'handover');
    const owner = await ownerMembership(org, admin.id);

    // Revoke first, grant after: the check waits for the commit.
    await withTransaction(
      db.prisma,
      async (tx) => {
        await tx.membership.update({ where: { id: owner.id }, data: { revokedAt: new Date() } });
        await tx.membership.create({
          data: {
            userId: heir.id,
            organizationId: org,
            scopeType: 'ORGANIZATION',
            scopeId: org,
            roleId: await roleId('org_owner'),
            source: 'DIRECT',
          },
        });
      },
      { organizationId: org },
    );

    expect(await liveOwners(org)).toBe(1);
    await expect(ownerMembership(org, heir.id)).resolves.toBeDefined();
  });

  it('[US-023:AC5] should not let two concurrent revocations leave an organization without an owner', async () => {
    const admin = await platformAdmin('race-admin@example.org');
    const second = await account('race-second@example.org');
    const org = await organization(admin, 'race-owners');
    const [first, other] = [await ownerMembership(org, admin.id), await grant(second.id, 'org_owner', org)];
    // Two commits rarely overlap on their own, so each transaction runs the check at its statement
    // (the same function the commit runs) and the second revokes while the first is still open. Without
    // the lock on the organization, both would see the other owner and both would commit.
    const immediate = (tx: Transaction) => tx.$executeRaw`SET CONSTRAINTS "memberships_keep_an_org_owner" IMMEDIATE`;
    let secondRevocation: Promise<unknown> | undefined;
    const firstRevocation = withTransaction(
      db.prisma,
      async (tx) => {
        await immediate(tx);
        await tx.membership.update({ where: { id: first.id }, data: { revokedAt: new Date() } });
        secondRevocation = withTransaction(
          db.prisma,
          async (tx2) => {
            await immediate(tx2);
            await tx2.membership.update({ where: { id: other.id }, data: { revokedAt: new Date() } });
          },
          { organizationId: org },
        );
        // With the lock the second one waits for this commit; give it time to get there.
        await Promise.race([secondRevocation.catch(() => undefined), new Promise((r) => setTimeout(r, 500))]);
      },
      { organizationId: org },
    );

    const outcomes = await Promise.allSettled([firstRevocation, firstRevocation.then(() => secondRevocation)]);
    expect(outcomes.map((o) => o.status)).toEqual(['fulfilled', 'rejected']);
    expect(String((outcomes[1] as PromiseRejectedResult).reason)).toMatch(/without an org_owner/);
    expect(await liveOwners(org)).toBe(1);
  });

  it('[US-023:AC5] should refuse an organization committed without an owner', async () => {
    await expect(db.prisma.organization.create({ data: { name: 'Huérfana', slug: 'huerfana' } })).rejects.toThrow(
      /without an org_owner/,
    );
    expect(await db.prisma.organization.count({ where: { slug: 'huerfana' } })).toBe(0);
  });
});
