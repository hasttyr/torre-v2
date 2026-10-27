import type { Server } from 'node:http';
import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { stubExampleEnv } from '../__tests__/env.js';
import { AppModule } from '../app.module.js';
import { APP_OPTIONS, configureApp } from '../app.setup.js';
import { DATABASE_PROBE, REDIS_PROBE } from './probes.js';
import type { Probe } from './probes.js';

const up: Probe = () => Promise.resolve();
const down =
  (message: string): Probe =>
  () =>
    Promise.reject(new Error(message));

let app: INestApplication | undefined;
const lines: string[] = [];

/** The API with the given probes; without overrides it uses the real ones on the configured URLs. */
async function start(probes: { database?: Probe; redis?: Probe } = {}, env: Record<string, string> = {}) {
  stubExampleEnv({ LOG_LEVEL: 'info', ...env });
  let builder = Test.createTestingModule({
    imports: [
      await AppModule.forRoot({
        ignoreEnvFile: true,
        counters: 'memory',
        stream: { write: (line: string) => lines.push(line) },
      }),
    ],
  });
  if (probes.database) builder = builder.overrideProvider(DATABASE_PROBE).useValue(probes.database);
  if (probes.redis) builder = builder.overrideProvider(REDIS_PROBE).useValue(probes.redis);
  app = configureApp((await builder.compile()).createNestApplication<NestExpressApplication>(APP_OPTIONS));
  await app.init();
  return request(app.getHttpServer() as Server);
}

afterEach(async () => {
  await app?.close();
  app = undefined;
  lines.length = 0;
  vi.unstubAllEnvs();
});

describe('health', () => {
  it('[US-006:AC4] should report the process alive at /health/live, outside the API prefix', async () => {
    const http = await start({ database: down('db down'), redis: down('redis down') });
    const live = await http.get('/health/live');

    expect(live.status).toBe(200);
    expect(live.body).toEqual({ status: 'ok', info: {}, error: {}, details: {} });
    expect((await http.get('/api/v1/health/live')).status).toBe(404);
  });

  it('[US-006:AC4] should be ready when the database and Redis answer', async () => {
    const http = await start({ database: up, redis: up });
    const ready = await http.get('/health/ready');

    expect(ready.status).toBe(200);
    expect(ready.body).toMatchObject({ status: 'ok', info: { database: { status: 'up' }, redis: { status: 'up' } } });
  });

  it('[US-006:AC4] should answer 503 naming the dependency that is down, and log why without credentials', async () => {
    const http = await start({ database: down('auth failed for postgresql://torre_app:hunter2@db/torre'), redis: up });
    const ready = await http.get('/health/ready');

    expect(ready.status).toBe(503);
    expect(ready.headers['content-type']).toBe('application/json; charset=utf-8');
    expect(ready.body).toEqual({
      status: 'error',
      info: { redis: { status: 'up' } },
      error: { database: { status: 'down' } },
      details: { database: { status: 'down' }, redis: { status: 'up' } },
    });
    const warning = lines.find((line) => line.includes('Dependency not ready'));
    expect(warning).toContain('"dependency":"database"');
    expect(warning).toContain('postgresql://[redacted]@db');
    expect(lines.join('\n')).not.toContain('hunter2');
  });

  it('[US-006:AC4] should detect real dependencies that do not answer, within the probe timeout', async () => {
    const http = await start(
      {},
      {
        DATABASE_URL: 'postgresql://torre_app:closed-port-pw@127.0.0.1:1/torre',
        REDIS_URL: 'redis://:closed-port-pw@127.0.0.1:1',
      },
    );
    const started = Date.now();
    const ready = await http.get('/health/ready');

    expect(ready.status).toBe(503);
    expect(ready.body).toMatchObject({ error: { database: { status: 'down' }, redis: { status: 'down' } } });
    expect(Date.now() - started).toBeLessThan(5_000);
    expect(ready.text + lines.join('\n')).not.toContain('closed-port-pw');
    // Connection-refused errors may come without a message: the log still says why.
    const reasons = lines
      .filter((line) => line.includes('Dependency not ready'))
      .map((line) => (JSON.parse(line) as { reason: string }).reason);
    expect(reasons).toHaveLength(2);
    for (const reason of reasons) expect(reason.length).toBeGreaterThan(0);
  }, 15_000);
});
