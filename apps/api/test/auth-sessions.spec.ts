import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { PRIVACY_POLICY_VERSION } from '@torre/contracts';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, inject, it, vi } from 'vitest';
import { stubExampleEnv } from '../src/__tests__/env.js';
import { AppModule } from '../src/app.module.js';
import { APP_OPTIONS, configureApp } from '../src/app.setup.js';
import { createPrismaClient } from '../src/database/prisma.js';
import { createTestDatabase } from './support/test-database.js';
import type { TestDatabase } from './support/test-database.js';

let db: TestDatabase;
let app: INestApplication;
let http: ReturnType<typeof request>;

const PASSWORD = 'una frase larga que nadie adivina';
const WEB_ORIGIN = 'http://localhost:5173';

beforeAll(async () => {
  db = await createTestDatabase();
  stubExampleEnv({
    DATABASE_URL: db.appUrl,
    REDIS_URL: inject('redis').url,
    LOG_LEVEL: 'silent',
    COOKIE_SECURE: 'true',
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

async function register(email: string): Promise<string> {
  const res = await http.post('/api/v1/auth/register').send({
    email,
    password: PASSWORD,
    displayName: 'Ana Pérez',
    locale: 'es',
    acceptedPrivacyPolicyVersion: PRIVACY_POLICY_VERSION,
  });
  expect(res.status).toBe(201);
  return (res.body as { id: string }).id;
}

const sidOf = (accessToken: string) =>
  (JSON.parse(Buffer.from(accessToken.split('.')[1] ?? '', 'base64url').toString()) as { sid: string }).sid;

async function signIn(email: string, userAgent = 'Firefox de prueba') {
  const res = await http.post('/api/v1/auth/login').set('user-agent', userAgent).send({ email, password: PASSWORD });
  expect(res.status).toBe(200);
  const { accessToken } = res.body as { accessToken: string };
  return {
    accessToken,
    cookie: String(res.headers['set-cookie']).split(';')[0] ?? '',
    sessionId: sidOf(accessToken),
    correlationId: String(res.headers['x-correlation-id']),
  };
}

const refresh = (cookie: string) => http.post('/api/v1/auth/refresh').set({ cookie, origin: WEB_ORIGIN });
const auditOf = (action: string, where: { actorUserId?: string | null; targetId?: string | null } = {}) =>
  db.prisma.auditLog.findMany({ where: { action, ...where }, orderBy: { occurredAt: 'asc' } });
const HMAC_HEX = /^[0-9a-f]{64}$/;

describe('security events in audit_log (US-022b)', () => {
  it('[US-022:AC7][TC-104] should record a login with the session, a keyed hash of the address and the correlation id', async () => {
    const userId = await register('audit-login@example.org');
    const { sessionId, correlationId } = await signIn('audit-login@example.org');
    const [row] = await auditOf('auth.login.succeeded', { actorUserId: userId });
    const session = await db.prisma.authSession.findUniqueOrThrow({ where: { id: sessionId } });

    expect(row).toMatchObject({
      actorUserId: userId,
      targetType: 'auth_session',
      targetId: sessionId,
      organizationId: null,
      correlationId,
    });
    expect(row?.ipHash).toMatch(HMAC_HEX);
    expect(session.ipHash).toBe(row?.ipHash);
    expect(JSON.stringify(row)).not.toMatch(/127\.0\.0\.1|::1|audit-login@example\.org/);
  });

  it('[US-022:AC7][TC-104] should record failed logins without the email, naming the account only when it exists', async () => {
    const userId = await register('audit-failed@example.org');
    await http
      .post('/api/v1/auth/login')
      .send({ email: 'audit-failed@example.org', password: 'otra frase equivocada' });
    await http.post('/api/v1/auth/login').send({ email: 'nadie-audit@example.org', password: PASSWORD });
    const rows = await auditOf('auth.login.failed');
    const known = rows.filter((r) => r.targetId === userId);
    const unknown = rows.filter((r) => r.targetId === null);

    expect(known).toHaveLength(1);
    expect(known[0]).toMatchObject({ actorUserId: null, targetType: 'user' });
    expect(unknown.length).toBeGreaterThanOrEqual(1);
    expect(JSON.stringify(rows)).not.toMatch(/@example\.org/);
  });

  it('[US-022:AC7][TC-036] should record a reused refresh token with the family it revoked', async () => {
    const userId = await register('audit-reuse@example.org');
    const { cookie, sessionId } = await signIn('audit-reuse@example.org');
    expect((await refresh(cookie)).status).toBe(200);
    expect((await refresh(cookie)).status).toBe(401);

    expect(await auditOf('auth.refresh.reused', { actorUserId: userId })).toMatchObject([
      { targetType: 'auth_session', targetId: sessionId },
    ]);
  });

  it('[US-022:AC7] should record a logout once, not when the session was already over', async () => {
    const userId = await register('audit-logout@example.org');
    const { cookie, sessionId } = await signIn('audit-logout@example.org');
    for (let i = 0; i < 2; i++) {
      expect((await http.post('/api/v1/auth/logout').set({ cookie, origin: WEB_ORIGIN })).status).toBe(204);
    }

    expect(await auditOf('auth.logout', { actorUserId: userId })).toMatchObject([
      { targetType: 'auth_session', targetId: sessionId },
    ]);
  });
});

describe('sessions (US-022b)', () => {
  it('[US-022:AC9] should list the live sessions of the account, the current one marked, without addresses', async () => {
    await register('sessions@example.org');
    await register('sessions-other@example.org');
    const first = await signIn('sessions@example.org', 'Navegador A');
    const second = await signIn('sessions@example.org', 'Navegador B');
    const ended = await signIn('sessions@example.org', 'Navegador C');
    const expired = await signIn('sessions@example.org', 'Navegador D');
    await signIn('sessions-other@example.org');
    await http.post('/api/v1/auth/logout').set({ cookie: ended.cookie, origin: WEB_ORIGIN });
    await db.prisma.authSession.update({ where: { id: expired.sessionId }, data: { expiresAt: new Date(0) } });
    await refresh(first.cookie);

    const res = await http.get('/api/v1/user/sessions').set('authorization', `Bearer ${second.accessToken}`);
    const body = res.body as { id: string; current: boolean; userAgent: string | null }[];

    expect(res.status).toBe(200);
    expect(body.map((s) => [s.id, s.userAgent, s.current])).toEqual([
      [first.sessionId, 'Navegador A', false],
      [second.sessionId, 'Navegador B', true],
    ]);
    expect(Object.keys(body[0] ?? {}).sort()).toEqual(
      ['createdAt', 'current', 'expiresAt', 'id', 'lastSeenAt', 'userAgent'].sort(),
    );
  });

  it('[US-022:AC9] should end every other session at once and keep the current one', async () => {
    const userId = await register('others@example.org');
    const current = await signIn('others@example.org', 'Este equipo');
    const others = [await signIn('others@example.org'), await signIn('others@example.org')];

    const res = await http.delete('/api/v1/user/other-sessions').set('authorization', `Bearer ${current.accessToken}`);
    const left = await http.get('/api/v1/user/sessions').set('authorization', `Bearer ${current.accessToken}`);

    expect(res.status).toBe(204);
    for (const other of others) expect((await refresh(other.cookie)).status).toBe(401);
    expect((await refresh(current.cookie)).status).toBe(200);
    expect((left.body as { id: string }[]).map((s) => s.id)).toEqual([current.sessionId]);
    expect(await auditOf('auth.sessions.revoked_others', { actorUserId: userId })).toMatchObject([
      { targetType: 'user', targetId: userId, changes: { revokedSessions: 2 } },
    ]);
  });

  it('[US-022:AC9] should need an access token for both routes', async () => {
    expect((await http.get('/api/v1/user/sessions')).status).toBe(401);
    expect((await http.delete('/api/v1/user/other-sessions')).status).toBe(401);
  });
});

describe('suspended and anonymized accounts (US-022b)', () => {
  it('[US-022:AC10][TC-104] should refuse the login of a suspended account, telling it only to whoever has the password', async () => {
    const userId = await register('suspended@example.org');
    await db.prisma.user.update({ where: { id: userId }, data: { status: 'SUSPENDED' } });

    const right = await http.post('/api/v1/auth/login').send({ email: 'suspended@example.org', password: PASSWORD });
    const wrong = await http
      .post('/api/v1/auth/login')
      .send({ email: 'suspended@example.org', password: 'otra frase equivocada' });

    expect(right.status).toBe(403);
    expect(right.body).toMatchObject({ code: 'ACCOUNT_SUSPENDED' });
    expect(right.headers['set-cookie']).toBeUndefined();
    expect(wrong.status).toBe(401);
    expect(await db.prisma.authSession.count({ where: { userId } })).toBe(0);
    expect(await auditOf('auth.login.refused', { actorUserId: userId })).toHaveLength(1);
  });

  it('[US-022:AC10] should refuse to renew the session of an account suspended after its login, ending it', async () => {
    const userId = await register('suspended-later@example.org');
    const { cookie, sessionId } = await signIn('suspended-later@example.org');
    await db.prisma.user.update({ where: { id: userId }, data: { status: 'SUSPENDED' } });

    const res = await refresh(cookie);
    const session = await db.prisma.authSession.findUniqueOrThrow({ where: { id: sessionId } });

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ code: 'ACCOUNT_SUSPENDED' });
    expect(session.revokedAt).toBeInstanceOf(Date);
    expect((await refresh(cookie)).status).toBe(401);
    expect(await auditOf('auth.refresh.refused', { actorUserId: userId })).toMatchObject([
      { targetType: 'auth_session', targetId: sessionId },
    ]);
  });

  it('[US-022:AC10] should never sign in an anonymized account again', async () => {
    const userId = await register('anonymized@example.org');
    await db.prisma.user.update({ where: { id: userId }, data: { status: 'ANONYMIZED' } });

    const res = await http.post('/api/v1/auth/login').send({ email: 'anonymized@example.org', password: PASSWORD });

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ code: 'ACCOUNT_SUSPENDED' });
  });
});

describe('append-only audit_log (DEC-077)', () => {
  it('[US-025:AC7][TC-209] should let the application insert and read but never update or delete', async () => {
    const row = await db.prisma.auditLog.create({ data: { action: 'test.append_only' } });

    await expect(
      db.prisma.auditLog.updateMany({ where: { id: row.id }, data: { action: 'test.rewritten' } }),
    ).rejects.toThrow(/permission denied/);
    await expect(db.prisma.auditLog.deleteMany({ where: { id: row.id } })).rejects.toThrow(/permission denied/);
    expect(await db.prisma.auditLog.findUniqueOrThrow({ where: { id: row.id } })).toMatchObject({
      action: 'test.append_only',
    });
  });

  it('[US-025:AC7][TC-209] should refuse updates, deletes and truncation even to the owner of the table', async () => {
    const owner = createPrismaClient(db.migrationUrl);
    try {
      const row = await owner.auditLog.create({ data: { action: 'test.owner' } });

      await expect(
        owner.auditLog.updateMany({ where: { id: row.id }, data: { action: 'test.rewritten' } }),
      ).rejects.toThrow(/append-only/);
      await expect(owner.auditLog.deleteMany({ where: { id: row.id } })).rejects.toThrow(/append-only/);
      await expect(owner.$executeRaw`TRUNCATE TABLE audit_log`).rejects.toThrow(/append-only/);
      expect(await owner.auditLog.count({ where: { id: row.id } })).toBe(1);
    } finally {
      await owner.$disconnect();
    }
  });
});
