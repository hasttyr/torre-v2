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
    imports: [await AppModule.forRoot({ ignoreEnvFile: true })],
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
