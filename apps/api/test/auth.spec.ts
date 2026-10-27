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
import { createTestDatabase } from './support/test-database.js';
import type { TestDatabase } from './support/test-database.js';

let db: TestDatabase;
let app: INestApplication;
let http: ReturnType<typeof request>;

const PASSWORD = 'una frase larga que nadie adivina';
const account = (email: string, overrides: Record<string, unknown> = {}) => ({
  email,
  password: PASSWORD,
  displayName: 'Ana Pérez',
  locale: 'es',
  acceptedPrivacyPolicyVersion: PRIVACY_POLICY_VERSION,
  ...overrides,
});

beforeAll(async () => {
  db = await createTestDatabase();
  stubExampleEnv({
    DATABASE_URL: db.appUrl,
    REDIS_URL: inject('redis').url,
    LOG_LEVEL: 'silent',
    COOKIE_SECURE: 'true',
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

/** The web app's origin in `.env.example` (CORS_ORIGINS): what a same-site browser request shows. */
const WEB_ORIGIN = 'http://localhost:5173';

/** `__Host-refresh=<token>` from a response, ready for a `Cookie` header. */
const refreshCookieOf = (res: { headers: Record<string, unknown> }): string => {
  const cookie = String(res.headers['set-cookie']).split(';')[0] ?? '';
  expect(cookie).toMatch(/^__Host-refresh=/);
  return cookie;
};

const claimsOf = (accessToken: string) =>
  JSON.parse(Buffer.from(accessToken.split('.')[1] ?? '', 'base64url').toString()) as { sub: string; sid: string };

async function signIn(email: string) {
  const res = await http.post('/api/v1/auth/login').send({ email, password: PASSWORD });
  expect(res.status).toBe(200);
  const { accessToken } = res.body as { accessToken: string };
  return { cookie: refreshCookieOf(res), accessToken, sessionId: claimsOf(accessToken).sid };
}

const refresh = (cookie: string, headers: Record<string, string> = { origin: WEB_ORIGIN }) =>
  http.post('/api/v1/auth/refresh').set({ cookie, ...headers });

describe('registration (US-022a)', () => {
  it('[US-022:AC1] should create a viewer account with the accepted policy version and the email lower-case', async () => {
    const res = await http.post('/api/v1/auth/register').send(account('Ana@Example.org'));
    const user = await db.prisma.user.findFirstOrThrow({ where: { id: (res.body as { id: string }).id } });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ email: 'ana@example.org', displayName: 'Ana Pérez', locale: 'es' });
    expect(user).toMatchObject({ status: 'ACTIVE', privacyPolicyVersion: PRIVACY_POLICY_VERSION });
    expect(user.privacyAcceptedAt).toBeInstanceOf(Date);
  });

  it('[US-022:AC2] should store the password as an argon2id hash with the OWASP parameters', async () => {
    await http.post('/api/v1/auth/register').send(account('hash@example.org'));
    const user = await db.prisma.user.findFirstOrThrow({ where: { email: 'hash@example.org' } });

    expect(user.passwordHash).toMatch(/^\$argon2id\$v=19\$m=19456,p=1,t=2\$/);
    expect(user.passwordHash).not.toContain(PASSWORD);
  });

  it('[US-022:AC1] should reject a weak password, an outdated policy and a taken email, field by field', async () => {
    await http.post('/api/v1/auth/register').send(account('taken@example.org'));
    const weak = await http.post('/api/v1/auth/register').send(account('weak@example.org', { password: 'corta' }));
    const outdated = await http
      .post('/api/v1/auth/register')
      .send(account('old@example.org', { acceptedPrivacyPolicyVersion: '2000-01-01' }));
    const taken = await http.post('/api/v1/auth/register').send(account('TAKEN@example.org'));

    expect(weak.body).toMatchObject({
      code: 'PASSWORD_POLICY_VIOLATION',
      errors: [{ path: 'password', code: 'too_short' }],
    });
    expect(outdated.body).toMatchObject({
      code: 'VALIDATION_FAILED',
      errors: [{ path: 'acceptedPrivacyPolicyVersion' }],
    });
    expect(taken.body).toMatchObject({ code: 'VALIDATION_FAILED', errors: [{ path: 'email', code: 'taken' }] });
  });
});

describe('login and access tokens (US-022a)', () => {
  beforeAll(async () => {
    await http.post('/api/v1/auth/register').send(account('login@example.org'));
  });

  it('[US-022:AC3] should return a 5-minute access token and set the refresh cookie', async () => {
    const res = await http.post('/api/v1/auth/login').send({ email: 'LOGIN@example.org', password: PASSWORD });
    const cookie = String(res.headers['set-cookie']);
    const [, payload] = String((res.body as { accessToken: string }).accessToken).split('.');
    const claims = JSON.parse(Buffer.from(payload!, 'base64url').toString()) as {
      sub: string;
      sid: string;
      exp: number;
      iat: number;
    };
    const session = await db.prisma.authSession.findUniqueOrThrow({ where: { id: claims.sid } });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ tokenType: 'Bearer', expiresIn: 300 });
    expect(claims.exp - claims.iat).toBe(300);
    expect(cookie).toMatch(/^__Host-refresh=[A-Za-z0-9_-]{43};/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Secure/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
    expect(cookie).toMatch(/Path=\//);
    expect(cookie).not.toMatch(/Domain=/i);
    // The session lasts 24 hours from the login (DEC-062).
    expect(session.expiresAt.getTime() - session.createdAt.getTime()).toBeGreaterThan(23.9 * 3_600_000);
    expect(JSON.stringify(res.body)).not.toContain(cookie.split(';')[0]!.split('=')[1]);
  });

  it('[US-022:AC1] should answer a wrong password and an unknown email in exactly the same way', async () => {
    const wrongPassword = await http
      .post('/api/v1/auth/login')
      .send({ email: 'login@example.org', password: 'otra frase que no es la buena' });
    const unknown = await http.post('/api/v1/auth/login').send({ email: 'nobody@example.org', password: PASSWORD });
    const strip = (body: Record<string, unknown>) => ({ ...body, correlationId: undefined });

    expect(wrongPassword.status).toBe(401);
    expect(strip(wrongPassword.body as Record<string, unknown>)).toEqual(
      strip(unknown.body as Record<string, unknown>),
    );
    expect(wrongPassword.headers['set-cookie']).toBeUndefined();
  });

  it('[US-022:AC8] should check the access token on every request, except on public routes', async () => {
    const login = await http.post('/api/v1/auth/login').send({ email: 'login@example.org', password: PASSWORD });
    const token = (login.body as { accessToken: string }).accessToken;

    const me = await http.get('/api/v1/me').set('authorization', `Bearer ${token}`);
    const anonymous = await http.get('/api/v1/me');
    const forged = await http.get('/api/v1/me').set('authorization', `Bearer ${token.slice(0, -2)}xx`);
    const publicRoute = await http.get('/api/v1/ping');

    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({ email: 'login@example.org', displayName: 'Ana Pérez' });
    expect(anonymous.status).toBe(401);
    expect(anonymous.body).toMatchObject({ code: 'UNAUTHENTICATED' });
    expect(forged.status).toBe(401);
    expect(publicRoute.status).toBe(200);
  });
});

describe('refresh rotation (US-022a2)', () => {
  beforeAll(async () => {
    await http.post('/api/v1/auth/register').send(account('refresh@example.org'));
  });

  it('[US-022:AC4] should spend the refresh token and issue a successor in the same session', async () => {
    const session = await signIn('refresh@example.org');

    const res = await refresh(session.cookie);
    const next = refreshCookieOf(res);
    const tokens = await db.prisma.refreshToken.findMany({
      where: { familyId: session.sessionId },
      orderBy: { createdAt: 'asc' },
    });
    const row = await db.prisma.authSession.findUniqueOrThrow({ where: { id: session.sessionId } });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ tokenType: 'Bearer', expiresIn: 300 });
    expect(claimsOf((res.body as { accessToken: string }).accessToken).sid).toBe(session.sessionId);
    expect(next).not.toBe(session.cookie);
    expect(tokens).toHaveLength(2);
    expect(tokens[0]).toMatchObject({ replacedBy: tokens[1]?.id });
    expect(tokens[0]?.revokedAt).toBeInstanceOf(Date);
    expect(tokens[1]?.revokedAt).toBeNull();
    // Rotation never extends the session: the successor and the cookie expire with it (DEC-062).
    expect(tokens[1]?.expiresAt).toEqual(row.expiresAt);
    expect(String(res.headers['set-cookie'])).toContain(`Expires=${row.expiresAt.toUTCString()}`);
    expect(String(res.headers['set-cookie'])).toMatch(/HttpOnly; Secure; SameSite=Strict/i);
  });

  it('[US-022:AC4][INV-A-1][TC-036] should revoke the whole family when a spent token comes back', async () => {
    const session = await signIn('refresh@example.org');
    const successor = refreshCookieOf(await refresh(session.cookie));

    const reused = await refresh(session.cookie);
    const afterReuse = await refresh(successor);
    const row = await db.prisma.authSession.findUniqueOrThrow({ where: { id: session.sessionId } });
    const alive = await db.prisma.refreshToken.count({ where: { familyId: session.sessionId, revokedAt: null } });

    expect(reused.status).toBe(401);
    expect(reused.body).toMatchObject({ code: 'UNAUTHENTICATED' });
    expect(afterReuse.status).toBe(401);
    expect(row.revokedAt).toBeInstanceOf(Date);
    expect(alive).toBe(0);
  });

  it('[US-022:AC4][INV-A-1][DEC-092] should let only one of two concurrent rotations of a token win', async () => {
    const session = await signIn('refresh@example.org');

    const results = await Promise.all([refresh(session.cookie), refresh(session.cookie)]);
    const row = await db.prisma.authSession.findUniqueOrThrow({ where: { id: session.sessionId } });

    expect(results.map((r) => r.status).sort()).toEqual([200, 401]);
    // The loser counts as a reuse: the family is revoked, the winner's successor included.
    expect(row.revokedAt).toBeInstanceOf(Date);
    expect(await db.prisma.refreshToken.count({ where: { familyId: session.sessionId, revokedAt: null } })).toBe(0);
  });

  it('[US-022:AC4][TC-207] should refuse to renew a session 24 hours after its login, however often it rotated', async () => {
    const session = await signIn('refresh@example.org');
    const rotated = refreshCookieOf(await refresh(session.cookie));
    await db.prisma.authSession.update({
      where: { id: session.sessionId },
      data: { expiresAt: new Date(Date.now() - 1_000) },
    });

    const expired = await refresh(rotated);

    expect(expired.status).toBe(401);
    expect(expired.body).toMatchObject({ code: 'UNAUTHENTICATED' });
  });

  it('[US-022:AC4] should answer a missing or unknown refresh cookie with the same 401', async () => {
    const missing = await http.post('/api/v1/auth/refresh').set('origin', WEB_ORIGIN);
    const unknown = await refresh('__Host-refresh=never-issued');

    expect(missing.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(missing.body).toMatchObject({ code: 'UNAUTHENTICATED' });
    expect(unknown.body).toMatchObject({ code: 'UNAUTHENTICATED' });
  });

  it('[US-022:AC11][INV-A-4][TC-207] should reject cross-site refreshes, with and without Sec-Fetch-Site', async () => {
    const session = await signIn('refresh@example.org');

    const crossSite = await refresh(session.cookie, { 'sec-fetch-site': 'cross-site', origin: WEB_ORIGIN });
    const foreignOrigin = await refresh(session.cookie, { origin: 'https://evil.example' });
    const foreignReferer = await refresh(session.cookie, { referer: 'https://evil.example/page' });
    const noHeaders = await refresh(session.cookie, {});
    const sameOrigin = await refresh(session.cookie, { 'sec-fetch-site': 'same-origin' });

    for (const rejected of [crossSite, foreignOrigin, foreignReferer, noHeaders]) {
      expect(rejected.status).toBe(403);
      expect(rejected.body).toMatchObject({ code: 'FORBIDDEN' });
      expect(rejected.headers['set-cookie']).toBeUndefined();
    }
    // The rejected requests never reached the token: it still rotates once.
    expect(sameOrigin.status).toBe(200);
  });
});

describe('logout (US-022a2)', () => {
  beforeAll(async () => {
    await http.post('/api/v1/auth/register').send(account('logout@example.org'));
  });

  const logout = (cookie: string | undefined, headers: Record<string, string> = { origin: WEB_ORIGIN }) => {
    const req = http.post('/api/v1/auth/logout').set(headers);
    return cookie === undefined ? req : req.set('cookie', cookie);
  };

  it('[US-022:AC5] should revoke the whole current family, clear the cookie and leave other sessions alone', async () => {
    const current = await signIn('logout@example.org');
    const other = await signIn('logout@example.org');
    const rotated = refreshCookieOf(await refresh(current.cookie));

    const res = await logout(rotated);
    const cleared = String(res.headers['set-cookie']);
    const session = await db.prisma.authSession.findUniqueOrThrow({ where: { id: current.sessionId } });
    const alive = await db.prisma.refreshToken.count({ where: { familyId: current.sessionId, revokedAt: null } });

    expect(res.status).toBe(204);
    expect(res.text).toBe('');
    expect(cleared).toMatch(/^__Host-refresh=;/);
    expect(cleared).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/i);
    expect(cleared).toMatch(/Secure/i);
    expect(cleared).toMatch(/Path=\//);
    expect(session.revokedAt).toBeInstanceOf(Date);
    expect(alive).toBe(0);
    expect((await refresh(rotated)).status).toBe(401);
    expect((await refresh(other.cookie)).status).toBe(200);
  });

  it('[US-022:AC5] should answer 204 without a session, so repeating it is harmless', async () => {
    const session = await signIn('logout@example.org');

    const first = await logout(session.cookie);
    const again = await logout(session.cookie);
    const anonymous = await logout(undefined);

    expect([first.status, again.status, anonymous.status]).toEqual([204, 204, 204]);
  });

  it('[US-022:AC11][INV-A-4][TC-207] should reject cross-site logouts and keep the session', async () => {
    const session = await signIn('logout@example.org');

    const crossSite = await logout(session.cookie, { 'sec-fetch-site': 'cross-site' });
    const foreignOrigin = await logout(session.cookie, { origin: 'https://evil.example' });
    const noHeaders = await logout(session.cookie, {});
    const row = await db.prisma.authSession.findUniqueOrThrow({ where: { id: session.sessionId } });

    expect([crossSite.status, foreignOrigin.status, noHeaders.status]).toEqual([403, 403, 403]);
    expect(crossSite.body).toMatchObject({ code: 'FORBIDDEN' });
    expect(row.revokedAt).toBeNull();
    expect((await refresh(session.cookie)).status).toBe(200);
  });
});
