import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { createMongoAbility, subject } from '@casl/ability';
import { unpackRules } from '@casl/ability/extra';
import type { PackRule } from '@casl/ability/extra';
import type { MongoAbility, RawRuleOf } from '@casl/ability';
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
import { AuthorizationService } from '../src/authz/authorization.service.js';
import { createPrismaClient } from '../src/database/prisma.js';
import type { PrismaClient } from '../src/database/prisma.js';
import { createTestDatabase } from './support/test-database.js';
import type { TestDatabase } from './support/test-database.js';

let db: TestDatabase;
let migrator: PrismaClient;
let app: INestApplication;
let http: ReturnType<typeof request>;
let authz: AuthorizationService;

const PASSWORD = 'una frase larga que nadie adivina';

beforeAll(async () => {
  db = await createTestDatabase();
  migrator = createPrismaClient(db.migrationUrl);
  stubExampleEnv({
    DATABASE_URL: db.appUrl,
    REDIS_URL: inject('redis').url,
    LOG_LEVEL: 'silent',
    AUTH_THROTTLE_LIMIT: '1000',
  });
  const moduleRef = await Test.createTestingModule({
    imports: [await AppModule.forRoot({ ignoreEnvFile: true, prefix: `torre-test-${randomUUID()}` })],
  }).compile();
  app = configureApp(moduleRef.createNestApplication<NestExpressApplication>(APP_OPTIONS));
  await app.init();
  http = request(app.getHttpServer() as Server);
  authz = app.get(AuthorizationService);
});

afterAll(async () => {
  await app.close();
  await migrator.$disconnect();
  await db.dispose();
  vi.unstubAllEnvs();
});

interface Account {
  readonly id: string;
  readonly token: string;
}

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
  return { id: (registered.body as { id: string }).id, token: (login.body as { accessToken: string }).accessToken };
}

const roleId = async (key: RoleKey) =>
  (await db.prisma.role.findFirstOrThrow({ where: { key, organizationId: null } })).id;

async function makePlatformAdmin(userId: string) {
  await db.prisma.membership.create({
    data: { userId, scopeType: 'PLATFORM', roleId: await roleId('platform_admin'), source: 'BOOTSTRAP' },
  });
  await authz.invalidate();
}

async function grant(userId: string, role: RoleKey, organizationId: string, scopeId = organizationId) {
  await db.prisma.membership.create({
    data: {
      userId,
      organizationId,
      scopeType: ROLE_SCOPES[role],
      scopeId,
      roleId: await roleId(role),
      source: 'DIRECT',
    },
  });
  await authz.invalidate();
}

const bearer = (who: Account) => ({ authorization: `Bearer ${who.token}` });
const createOrganization = (who: Account, slug: string) =>
  http
    .post('/api/v1/organizations')
    .set(bearer(who))
    .send({ name: `Organización ${slug}`, slug });

async function organization(admin: Account, slug: string): Promise<string> {
  const res = await createOrganization(admin, slug);
  expect(res.status).toBe(201);
  return (res.body as { id: string }).id;
}

describe('@RequirePermission and the fine check (US-024)', () => {
  it('[US-024:AC2][TC-047] should let only accounts holding organization.create create an organization', async () => {
    const admin = await account('authz-create-admin@example.org');
    const viewer = await account('authz-create-viewer@example.org');
    await makePlatformAdmin(admin.id);

    expect((await createOrganization(viewer, 'authz-viewer')).status).toBe(403);
    expect((await createOrganization(admin, 'authz-admin')).status).toBe(201);
  });

  it('[US-024:AC2][INV-T-3] should show an organization to its members and answer 403 for another one', async () => {
    const admin = await account('authz-view-admin@example.org');
    await makePlatformAdmin(admin.id);
    const member = await account('authz-view-member@example.org');
    const viewer = await account('authz-view-viewer@example.org');
    const mine = await organization(admin, 'authz-mine');
    const theirs = await organization(admin, 'authz-theirs');
    await grant(member.id, 'arbiter', mine, randomUUID());

    const own = await http.get(`/api/v1/organizations/${mine}`).set(bearer(member));
    expect([own.status, own.body]).toEqual([200, { id: mine, name: 'Organización authz-mine', slug: 'authz-mine' }]);
    // Coarse check passes (organization.view somewhere), the loaded resource does not.
    const other = await http.get(`/api/v1/organizations/${theirs}`).set(bearer(member));
    expect([other.status, (other.body as { code: string }).code]).toEqual([403, 'FORBIDDEN']);
    // Without memberships the coarse check already refuses.
    expect((await http.get(`/api/v1/organizations/${mine}`).set(bearer(viewer))).status).toBe(403);
    // platform_admin sees any organization; an unknown id is 404.
    expect((await http.get(`/api/v1/organizations/${theirs}`).set(bearer(admin))).status).toBe(200);
    expect((await http.get(`/api/v1/organizations/${randomUUID()}`).set(bearer(admin))).status).toBe(404);
  });
});

describe('AuthorizationService (US-024)', () => {
  it('[US-024:AC3] should answer with an action, a subject and plain attributes, without CASL in the caller', async () => {
    const admin = await account('authz-service-admin@example.org');
    await makePlatformAdmin(admin.id);
    const arbiter = await account('authz-service-arbiter@example.org');
    const org = await organization(admin, 'authz-service');
    const tournament = randomUUID();
    await grant(arbiter.id, 'arbiter', org, tournament);

    const game = (tournamentId: string) => ({ organizationId: org, tournamentId });
    expect(await authz.can(arbiter.id, 'game.record', 'Game', game(tournament))).toBe(true);
    expect(await authz.can(arbiter.id, 'game.record', 'Game', game(randomUUID()))).toBe(false);
    expect(await authz.can(arbiter.id, 'tournament.create', 'Tournament', { organizationId: org })).toBe(false);
    expect(await authz.can(null, 'game.record', 'Game', game(tournament))).toBe(false);
    await expect(authz.assertCan(arbiter.id, 'game.correct_admin', 'Game', game(tournament))).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('[US-024:AC4] should read permissions from the cache until a change invalidates it', async () => {
    const someone = await account('authz-cache@example.org');
    expect((await createOrganization(someone, 'authz-cache-1')).status).toBe(403);

    // A membership written without invalidating: the cached permissions still answer.
    await db.prisma.membership.create({
      data: { userId: someone.id, scopeType: 'PLATFORM', roleId: await roleId('platform_admin'), source: 'BOOTSTRAP' },
    });
    expect((await createOrganization(someone, 'authz-cache-2')).status).toBe(403);

    await authz.invalidate();
    expect((await createOrganization(someone, 'authz-cache-3')).status).toBe(201);
  });

  it('[US-024:AC4] should see a change of a role’s permissions after the invalidation', async () => {
    const admin = await account('authz-role-admin@example.org');
    await makePlatformAdmin(admin.id);
    const arbiter = await account('authz-role-arbiter@example.org');
    const org = await organization(admin, 'authz-role');
    const tournament = randomUUID();
    await grant(arbiter.id, 'arbiter', org, tournament);
    const claim = { organizationId: org, tournamentId: tournament };
    expect(await authz.can(arbiter.id, 'claim.file', 'Claim', claim)).toBe(false);

    // platform_admin gives arbiters claim.file (US-108 will do it through the API and invalidate).
    await db.prisma.rolePermission.create({ data: { roleId: await roleId('arbiter'), permissionKey: 'claim.file' } });
    await authz.invalidate();

    expect(await authz.can(arbiter.id, 'claim.file', 'Claim', claim)).toBe(true);
    await migrator.rolePermission.delete({
      where: { roleId_permissionKey: { roleId: await roleId('arbiter'), permissionKey: 'claim.file' } },
    });
    await authz.invalidate();
  });

  it('[US-024:AC4] should keep permissions out of the access token', async () => {
    const admin = await account('authz-jwt@example.org');
    await makePlatformAdmin(admin.id);
    const login = await http.post('/api/v1/auth/login').send({ email: 'authz-jwt@example.org', password: PASSWORD });
    const token = (login.body as { accessToken: string }).accessToken;
    const claims = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString()) as Record<
      string,
      unknown
    >;

    expect(Object.keys(claims).sort()).toEqual(['exp', 'iat', 'sid', 'sub']);
  });
});

describe('abilities for the web and filtered listings (US-024)', () => {
  it('[US-024:AC8] should hand the web the packed rules of the account, the same the API applies', async () => {
    const admin = await account('authz-rules-admin@example.org');
    await makePlatformAdmin(admin.id);
    const arbiter = await account('authz-rules-arbiter@example.org');
    const org = await organization(admin, 'authz-rules');
    const tournament = randomUUID();
    await grant(arbiter.id, 'arbiter', org, tournament);

    const res = await http.get('/api/v1/me/abilities').set(bearer(arbiter));
    expect(res.status).toBe(200);
    const web = createMongoAbility(unpackRules((res.body as { rules: PackRule<RawRuleOf<MongoAbility>>[] }).rules));
    const game = (tournamentId: string, roundStatus = 'PUBLISHED') =>
      subject('Game', { organizationId: org, tournamentId, roundStatus });
    expect(web.can('game.record', game(tournament))).toBe(true);
    expect(web.can('game.record', game(randomUUID()))).toBe(false);
    expect(web.can('game.record', game(tournament, 'CLOSED'))).toBe(false);
    expect(web.can('tournament.create', subject('Tournament', { organizationId: org }))).toBe(false);
    expect((await http.get('/api/v1/me/abilities')).status).toBe(401);
  });

  it('[US-024:AC8] should give an account without memberships only public reads and its own resources', async () => {
    const viewer = await account('authz-rules-viewer@example.org');

    const res = await http.get('/api/v1/me/abilities').set(bearer(viewer));
    const web = createMongoAbility(unpackRules((res.body as { rules: PackRule<RawRuleOf<MongoAbility>>[] }).rules));
    expect(web.can('read', subject('Tournament', { visibility: 'PUBLIC', archivedAt: null }))).toBe(true);
    expect(web.can('profile.update_own', subject('User', { id: viewer.id }))).toBe(true);
    expect(web.can('organization.view', subject('Organization', { organizationId: randomUUID() }))).toBe(false);
  });

  it('[US-024:AC9][TC-150] should filter the list of organizations with accessibleBy', async () => {
    const admin = await account('authz-list-admin@example.org');
    await makePlatformAdmin(admin.id);
    const member = await account('authz-list-member@example.org');
    const viewer = await account('authz-list-viewer@example.org');
    const mine = await organization(admin, 'authz-list-mine');
    const theirs = await organization(admin, 'authz-list-theirs');
    await grant(member.id, 'captain', mine, randomUUID());

    const list = async (who: Account) =>
      ((await http.get('/api/v1/organizations').set(bearer(who))).body as { id: string }[]).map((o) => o.id);
    const all = (await db.prisma.organization.findMany({ where: { deletedAt: null } })).map((o) => o.id);

    expect(await list(member)).toEqual([mine]);
    expect((await list(admin)).sort()).toEqual(all.sort());
    expect(await list(admin)).toEqual(expect.arrayContaining([mine, theirs]));
    expect(await list(viewer)).toEqual([]);
    expect(await authz.accessibleWhere(viewer.id, 'organization.view', 'Organization')).toBeNull();
  });
});
