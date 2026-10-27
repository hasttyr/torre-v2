import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { Redis } from 'ioredis';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, inject, it, vi } from 'vitest';
import { stubExampleEnv } from '../src/__tests__/env.js';
import { AppModule } from '../src/app.module.js';
import { APP_OPTIONS, configureApp } from '../src/app.setup.js';
import { counterKey, RedisRateCounter } from '../src/common/counters.js';
import { createTestDatabase } from './support/test-database.js';
import type { TestDatabase } from './support/test-database.js';

let db: TestDatabase;
let redis: Redis;
const apps: INestApplication[] = [];

async function startApp(prefix: string, env: Record<string, string> = {}): Promise<ReturnType<typeof request>> {
  stubExampleEnv({ DATABASE_URL: db.appUrl, REDIS_URL: inject('redis').url, LOG_LEVEL: 'silent', ...env });
  const moduleRef = await Test.createTestingModule({
    imports: [await AppModule.forRoot({ ignoreEnvFile: true, prefix })],
  }).compile();
  const app = configureApp(moduleRef.createNestApplication<NestExpressApplication>(APP_OPTIONS));
  await app.init();
  apps.push(app);
  return request(app.getHttpServer());
}

beforeAll(async () => {
  db = await createTestDatabase();
  redis = new Redis(inject('redis').url);
});

afterAll(async () => {
  await Promise.all(apps.map((app) => app.close()));
  redis.disconnect();
  await db.dispose();
  vi.unstubAllEnvs();
});

describe('rate counters in Redis', () => {
  it('[DEC-062] should count windows, streaks and locks atomically under the prefix, with hashed names', async () => {
    const prefix = `torre-test-${randomUUID()}`;
    const counter = new RedisRateCounter(redis, prefix);
    const key = counterKey('login', 'ana@example.org');

    const hits = await Promise.all(Array.from({ length: 5 }, () => counter.hit(key, 60_000)));
    const streak = [await counter.extend('streak', 60_000), await counter.extend('streak', 60_000)];
    await counter.lock('lock', 30_000);
    const stored = await redis.keys(`${prefix}:*`);

    expect(hits.map((h) => h.hits).sort()).toEqual([1, 2, 3, 4, 5]);
    expect(Math.min(...hits.map((h) => h.resetMs))).toBeGreaterThan(59_000);
    expect(await redis.pttl(`${prefix}:rate:${key}`)).toBeGreaterThan(0);
    expect(streak).toEqual([1, 2]);
    expect(await counter.ttl('lock')).toBeGreaterThan(29_000);
    expect(stored.join()).not.toContain('ana');
    await counter.clear('lock');
    expect(await counter.ttl('lock')).toBe(0);
  });

  it('[US-006:AC5][DEC-062] should share the general limit between API instances', async () => {
    const prefix = `torre-test-${randomUUID()}`;
    const first = await startApp(prefix, { API_THROTTLE_LIMIT: '3' });
    const second = await startApp(prefix, { API_THROTTLE_LIMIT: '3' });

    const statuses = [
      (await first.get('/api/v1/ping')).status,
      (await second.get('/api/v1/ping')).status,
      (await first.get('/api/v1/ping')).status,
    ];
    const limited = await second.get('/api/v1/ping');

    expect(statuses).toEqual([200, 200, 200]);
    expect(limited.status).toBe(429);
    expect(limited.body).toMatchObject({ code: 'RATE_LIMITED' });
    expect(Number(limited.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('[DEC-090] should keep serving, health checks included, while the counters are down', async () => {
    const http = await startApp(`torre-test-${randomUUID()}`, {
      REDIS_URL: 'redis://127.0.0.1:1',
      API_THROTTLE_LIMIT: '1',
    });

    const pings = [(await http.get('/api/v1/ping')).status, (await http.get('/api/v1/ping')).status];
    const live = await http.get('/health/live');

    expect(pings).toEqual([200, 200]);
    expect(live.status).toBe(200);
  });
});
