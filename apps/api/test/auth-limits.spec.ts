import { randomUUID } from 'node:crypto';
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
const apps: NestExpressApplication[] = [];

const PASSWORD = 'una frase larga que nadie adivina';
const WRONG = 'otra frase larga que no es la buena';

/** The API with the limits of .env.example (10 attempts / 15 min, 15-minute lock). */
async function startApp(env: Record<string, string> = {}): Promise<ReturnType<typeof request>> {
  stubExampleEnv({ DATABASE_URL: db.appUrl, REDIS_URL: inject('redis').url, LOG_LEVEL: 'silent', ...env });
  const moduleRef = await Test.createTestingModule({
    imports: [await AppModule.forRoot({ ignoreEnvFile: true, prefix: `torre-test-${randomUUID()}` })],
  }).compile();
  const app = configureApp(moduleRef.createNestApplication<NestExpressApplication>(APP_OPTIONS));
  // As behind the proxy of a deployment (US-105): the client address comes from X-Forwarded-For.
  app.set('trust proxy', 'loopback');
  await app.init();
  apps.push(app);
  return request(app.getHttpServer());
}

let http: ReturnType<typeof request>;

const login = (email: string, password: string, address: string) =>
  http.post('/api/v1/auth/login').set('x-forwarded-for', address).send({ email, password });

const register = (email: string, address: string) =>
  http
    .post('/api/v1/auth/register')
    .set('x-forwarded-for', address)
    .send({
      email,
      password: PASSWORD,
      displayName: 'Ana',
      locale: 'es',
      acceptedPrivacyPolicyVersion: PRIVACY_POLICY_VERSION,
    });

beforeAll(async () => {
  db = await createTestDatabase();
  http = await startApp();
  expect((await register('ana@example.org', '192.0.2.1')).status).toBe(201);
  expect((await register('luis@example.org', '192.0.2.1')).status).toBe(201);
});

afterAll(async () => {
  await Promise.all(apps.map((app) => app.close()));
  await db.dispose();
  vi.unstubAllEnvs();
});

describe('attempt limits (US-022a2)', () => {
  it('[US-022:AC6][TC-104] should answer 429 with Retry-After on the 11th login from one address', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 10; i += 1) statuses.push((await login(`nobody${i}@example.org`, WRONG, '203.0.113.1')).status);
    const limited = await login('luis@example.org', PASSWORD, '203.0.113.1');
    const elsewhere = await login('luis@example.org', PASSWORD, '203.0.113.2');

    expect(statuses).toEqual(Array.from({ length: 10 }, () => 401));
    expect(limited.status).toBe(429);
    expect(limited.body).toMatchObject({ code: 'RATE_LIMITED', status: 429 });
    expect(Number(limited.headers['retry-after'])).toBeGreaterThan(14 * 60);
    expect(limited.headers['set-cookie']).toBeUndefined();
    expect(elsewhere.status).toBe(200);
  });

  it('[US-022:AC6][TC-104] should answer 429 on the 11th registration from one address', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 10; i += 1) statuses.push((await register(`new${i}@example.org`, '203.0.113.20')).status);
    const limited = await register('new10@example.org', '203.0.113.20');

    expect(statuses).toEqual(Array.from({ length: 10 }, () => 201));
    expect(limited.status).toBe(429);
    expect(limited.body).toMatchObject({ code: 'RATE_LIMITED' });
    expect(await db.prisma.user.count({ where: { email: 'new10@example.org' } })).toBe(0);
  });

  it('[US-022:AC6][TC-104] should lock an email after 10 failures in a row, from any address and with the right password', async () => {
    for (let i = 0; i < 10; i += 1) expect((await login('ana@example.org', WRONG, `198.51.100.${i}`)).status).toBe(401);

    const locked = await login('ana@example.org', PASSWORD, '198.51.100.200');

    expect(locked.status).toBe(429);
    expect(locked.body).toMatchObject({ code: 'RATE_LIMITED' });
    expect(Number(locked.headers['retry-after'])).toBeGreaterThan(14 * 60);
  });

  it('[US-022:AC6][TC-104] should lock an unknown email the same way, so the lock reveals no account', async () => {
    for (let i = 0; i < 10; i += 1) await login('ghost@example.org', WRONG, `198.51.101.${i}`);
    for (let i = 0; i < 10; i += 1) await login('luis@example.org', WRONG, `198.51.102.${i}`);

    const ghost = await login('ghost@example.org', WRONG, '198.51.101.200');
    const real = await login('luis@example.org', WRONG, '198.51.102.200');
    const strip = (body: Record<string, unknown>) => ({ ...body, correlationId: undefined });

    expect(ghost.status).toBe(429);
    expect(real.status).toBe(429);
    expect(strip(ghost.body as Record<string, unknown>)).toEqual(strip(real.body as Record<string, unknown>));
  });

  it('[US-022:AC6][DEC-090] should fail closed when the counters are down: no login, no registration', async () => {
    http = await startApp({ REDIS_URL: 'redis://127.0.0.1:1' });

    const signIn = await login('luis@example.org', PASSWORD, '203.0.113.50');
    const signUp = await register('later@example.org', '203.0.113.50');

    expect(signIn.status).toBe(500);
    expect(signIn.body).toMatchObject({ code: 'INTERNAL_ERROR' });
    expect(signIn.headers['set-cookie']).toBeUndefined();
    expect(signUp.status).toBe(500);
    expect(await db.prisma.user.count({ where: { email: 'later@example.org' } })).toBe(0);
  });
});
