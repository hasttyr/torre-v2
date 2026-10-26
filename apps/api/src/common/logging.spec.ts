import type { Server } from 'node:http';
import { Body, Controller, Get, Module, Post } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { pino } from 'pino';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { stubExampleEnv } from '../__tests__/env.js';
import { AppModule } from '../app.module.js';
import { APP_OPTIONS, configureApp } from '../app.setup.js';
import { REDACT_PATHS, REDACTED, scrubCredentials } from './logging.module.js';

@Controller('probe')
class ProbeController {
  @Post('login')
  login(@Body() _body: unknown): { ok: true } {
    return { ok: true };
  }

  @Get('crash')
  crash(): never {
    throw new Error('connect failed: postgresql://torre_app:hunter2@db.internal:5432/torre');
  }
}
@Module({ controllers: [ProbeController] })
class ProbeModule {}

const lines: string[] = [];
const records = (): Record<string, unknown>[] => lines.map((line) => JSON.parse(line) as Record<string, unknown>);
let app: INestApplication;

beforeAll(async () => {
  stubExampleEnv({ LOG_LEVEL: 'info' });
  const moduleRef = await Test.createTestingModule({
    imports: [
      await AppModule.forRoot({ ignoreEnvFile: true, stream: { write: (line: string) => lines.push(line) } }),
      ProbeModule,
    ],
  }).compile();
  app = configureApp(moduleRef.createNestApplication<NestExpressApplication>(APP_OPTIONS));
  await app.init();
});

beforeEach(() => {
  lines.length = 0;
});

afterAll(async () => {
  await app.close();
  vi.unstubAllEnvs();
});

const http = () => request(app.getHttpServer() as Server);

describe('request logs', () => {
  it('[US-006:AC1] should write one JSON line per request with the correlation id of the response', async () => {
    const res = await http().post('/api/v1/probe/login?next=%2Fhome').send({});
    const completed = records().find((r) => r['msg'] === 'request completed');

    expect(completed).toMatchObject({
      level: 30,
      correlationId: res.headers['x-correlation-id'],
      req: { method: 'POST', url: '/api/v1/probe/login' },
      res: { statusCode: 201 },
    });
  });

  it('[US-006:AC1][INV-PRIV-2][DEC-080] should never log credentials, cookies, query strings, bodies or emails', async () => {
    const secrets = [
      'Bearer-SECRET-access',
      'REFRESH-SECRET-cookie',
      'RESET-SECRET-token',
      'ana@example.org',
      'not-a-real-pw',
    ];
    await http()
      .post('/api/v1/probe/login?token=RESET-SECRET-token&email=ana%40example.org')
      .set('Authorization', 'Bearer Bearer-SECRET-access')
      .set('Cookie', '__Host-refresh=REFRESH-SECRET-cookie')
      .send({ email: 'ana@example.org', password: 'not-a-real-pw' });

    expect(lines.length).toBeGreaterThan(0);
    for (const secret of secrets) expect(lines.join('\n')).not.toContain(secret);
    expect(lines.join('\n')).not.toContain('example.org');
  });

  it('[US-006:AC1][US-006:AC3] should log unexpected errors with their stack and correlation id, without credentials', async () => {
    const res = await http().get('/api/v1/probe/crash');
    const logged = records().find(
      (r) => r['err'] !== undefined && r['correlationId'] === res.headers['x-correlation-id'],
    );

    expect(logged).toBeDefined();
    expect(JSON.stringify(logged)).toContain('connect failed');
    expect(JSON.stringify(logged)).toContain(`postgresql://${REDACTED}@db.internal`);
    expect(lines.join('\n')).not.toContain('hunter2');
  });
});

describe('redaction', () => {
  it('[US-006:AC1][INV-PRIV-2] should censor sensitive fields if they ever reach a log', () => {
    const out: string[] = [];
    const logger = pino(
      { redact: { paths: REDACT_PATHS, censor: REDACTED } },
      { write: (line: string) => out.push(line) },
    );

    logger.info({
      password: 'p1',
      user: { email: 'ana@example.org', id: 'u-1' },
      body: { refreshToken: 't1', totpCode: '123456' },
      req: { headers: { authorization: 'Bearer x', cookie: 'c=1' } },
    });

    expect(JSON.parse(out[0] ?? '{}')).toMatchObject({
      password: REDACTED,
      user: { email: REDACTED, id: 'u-1' },
      body: { refreshToken: REDACTED, totpCode: REDACTED },
      req: { headers: { authorization: REDACTED, cookie: REDACTED } },
    });
  });

  it('[US-006:AC1] should strip the credentials of any URL inside a message', () => {
    expect(scrubCredentials('a redis://:pw@cache:6379 and smtps://u:p@mail and https://example.org/x')).toBe(
      `a redis://${REDACTED}@cache:6379 and smtps://${REDACTED}@mail and https://example.org/x`,
    );
  });
});
