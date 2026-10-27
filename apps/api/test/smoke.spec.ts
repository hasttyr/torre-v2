import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, inject, it, vi } from 'vitest';
import { stubExampleEnv } from '../src/__tests__/env.js';
import { AppModule } from '../src/app.module.js';
import { APP_OPTIONS, configureApp } from '../src/app.setup.js';
import { createTestDatabase } from './support/test-database.js';
import type { TestDatabase } from './support/test-database.js';

let db: TestDatabase;
let app: INestApplication;

beforeAll(async () => {
  db = await createTestDatabase();
  // The documented local configuration, pointed at the services of this run.
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

describe('smoke', () => {
  it('[TC-081] should boot with .env.example and answer live, ready (real PostgreSQL and Redis) and docs', async () => {
    const http = request(app.getHttpServer() as Server);
    const live = await http.get('/health/live');
    const ready = await http.get('/health/ready');
    const docs = await http.get('/api/docs');
    const ping = await http.get('/api/v1/ping');

    expect(live.status).toBe(200);
    expect(ready.status).toBe(200);
    expect(ready.body).toMatchObject({ info: { database: { status: 'up' }, redis: { status: 'up' } } });
    expect(docs.status).toBe(200);
    expect(ping.body).toEqual({ pong: true });
  });
});
