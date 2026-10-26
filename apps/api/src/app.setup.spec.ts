import type { Server } from 'node:http';
import { Body, Controller, Get, Module, Post } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { DomainError } from '@torre/core';
import { stubExampleEnv } from './__tests__/env.js';
import { AppModule } from './app.module.js';
import { APP_OPTIONS, configureApp } from './app.setup.js';
import { apiError, fromDomainError } from './common/api-error.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Routes that fail on purpose, to see what the client receives. */
@Controller('probe')
class ProbeController {
  @Get('expected')
  expected(): never {
    throw apiError('GAME_ALREADY_HAS_RESULT', {
      detail: 'Use the correction endpoint.',
      errors: [{ path: 'result', code: 'ALREADY_SET', message: 'The game has a result' }],
    });
  }

  @Get('domain')
  domain(): never {
    throw fromDomainError(new DomainError('ROUND_CLOSED', { round: 3, internal: 'stream 42' }));
  }

  @Get('unmapped-domain')
  unmappedDomain(): never {
    throw fromDomainError(new DomainError('SOMETHING_NOBODY_CATALOGUED'));
  }

  @Get('crash')
  crash(): never {
    throw new Error('connection to postgres://torre_app:hunter2@db failed');
  }

  @Get('ok')
  ok(): { ok: true } {
    return { ok: true };
  }

  @Post('echo')
  echo(@Body() body: unknown): unknown {
    return body;
  }
}
@Module({ controllers: [ProbeController] })
class ProbeModule {}

let app: INestApplication;

beforeAll(async () => {
  stubExampleEnv({ LOG_LEVEL: 'silent' });
  const moduleRef = await Test.createTestingModule({
    imports: [await AppModule.forRoot({ ignoreEnvFile: true }), ProbeModule],
  }).compile();
  app = configureApp(moduleRef.createNestApplication<NestExpressApplication>(APP_OPTIONS));
  await app.init();
});

afterAll(async () => {
  await app.close();
  vi.unstubAllEnvs();
});

const http = () => request(app.getHttpServer() as Server);

describe('problem+json errors', () => {
  it('[US-006:AC2][US-006:AC3] should answer an expected error with its catalog code, status and fields', async () => {
    const res = await http().get('/api/v1/probe/expected');

    expect(res.status).toBe(409);
    expect(res.headers['content-type']).toBe('application/problem+json; charset=utf-8');
    expect(JSON.parse(res.text)).toEqual({
      type: 'about:blank',
      title: 'Game already has a result',
      status: 409,
      code: 'GAME_ALREADY_HAS_RESULT',
      detail: 'Use the correction endpoint.',
      correlationId: res.headers['x-correlation-id'],
      errors: [{ path: 'result', code: 'ALREADY_SET', message: 'The game has a result' }],
    });
  });

  it('[US-006:AC3] should map a domain error by its code without exposing its details', async () => {
    const res = await http().get('/api/v1/probe/domain');

    expect(res.status).toBe(409);
    expect(JSON.parse(res.text)).toMatchObject({ code: 'ROUND_CLOSED', status: 409 });
    expect(res.text).not.toContain('stream 42');
  });

  it('[US-006:AC3] should answer 500 without internal details for unexpected errors', async () => {
    for (const path of ['/api/v1/probe/crash', '/api/v1/probe/unmapped-domain']) {
      const res = await http().get(path);
      const body = JSON.parse(res.text) as Record<string, unknown>;

      expect(res.status, path).toBe(500);
      expect(body, path).toEqual({
        type: 'about:blank',
        title: 'Internal error',
        status: 500,
        code: 'INTERNAL_ERROR',
        correlationId: res.headers['x-correlation-id'],
      });
      expect(res.text, path).not.toMatch(/hunter2|postgres|SOMETHING_NOBODY|at .*\.ts/);
    }
  });

  it('[US-006:AC2] should answer unknown routes and malformed bodies as problem+json too', async () => {
    const missing = await http().get('/api/v1/nothing-here');
    const malformed = await http().post('/api/v1/probe/echo').set('content-type', 'application/json').send('{"a":');

    expect(missing.status).toBe(404);
    expect(JSON.parse(missing.text)).toMatchObject({ code: 'NOT_FOUND' });
    expect(malformed.status).toBe(400);
    expect(JSON.parse(malformed.text)).toMatchObject({ code: 'VALIDATION_FAILED' });
    expect(malformed.text).not.toContain('JSON');
  });
});

describe('routes', () => {
  it('[US-006:AC6] should serve the API under /api/v1 only', async () => {
    expect((await http().get('/api/v1/probe/ok')).body).toEqual({ ok: true });
    expect((await http().get('/probe/ok')).status).toBe(404);
  });
});

describe('correlation id', () => {
  it('[US-006:AC1] should generate one when the caller sends none and return it', async () => {
    const res = await http().get('/api/v1/probe/ok');

    expect(res.headers['x-correlation-id']).toMatch(UUID);
  });

  it('[US-006:AC1] should keep a well-formed id from the caller, in the header and in errors', async () => {
    const res = await http().get('/api/v1/probe/expected').set('X-Correlation-Id', 'web-01HZX3K9:retry.2');

    expect(res.headers['x-correlation-id']).toBe('web-01HZX3K9:retry.2');
    expect(JSON.parse(res.text)).toMatchObject({ correlationId: 'web-01HZX3K9:retry.2' });
  });

  it('[US-006:AC1] should replace an id that could forge log lines or is too long', async () => {
    for (const given of ['abc def', 'id"}{"level":"fatal', 'x'.repeat(129)]) {
      const res = await http().get('/api/v1/probe/ok').set('X-Correlation-Id', given);

      expect(res.headers['x-correlation-id'], given).toMatch(UUID);
    }
  });
});
