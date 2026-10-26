import { Body, Controller, Get, HttpCode, Module, Post } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { stubExampleEnv } from '../__tests__/env.js';
import { AppModule } from '../app.module.js';
import { APP_OPTIONS, configureApp } from '../app.setup.js';

@Controller('probe')
class ProbeController {
  @Get('ok')
  ok(): { ok: true } {
    return { ok: true };
  }

  @Post('echo')
  @HttpCode(200)
  echo(@Body() body: { data?: string }): { length: number } {
    return { length: body.data?.length ?? 0 };
  }
}
@Module({ controllers: [ProbeController] })
class ProbeModule {}

let app: NestExpressApplication | undefined;

async function start(env: Record<string, string> = {}) {
  stubExampleEnv({ LOG_LEVEL: 'silent', CORS_ORIGINS: 'https://torre.example', ...env });
  const moduleRef = await Test.createTestingModule({
    imports: [await AppModule.forRoot({ ignoreEnvFile: true }), ProbeModule],
  }).compile();
  app = configureApp(moduleRef.createNestApplication<NestExpressApplication>(APP_OPTIONS));
  await app.init();
  return request(app.getHttpServer());
}

afterEach(async () => {
  await app?.close();
  app = undefined;
  vi.unstubAllEnvs();
});

describe('security headers', () => {
  it('[US-006:AC5] should send helmet headers and hide the framework', async () => {
    const res = await (await start()).get('/api/v1/probe/ok');

    expect(res.headers).toMatchObject({
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'SAMEORIGIN',
      'strict-transport-security': expect.stringContaining('max-age=') as unknown,
      'content-security-policy': expect.stringContaining("default-src 'self'") as unknown,
    });
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('CORS', () => {
  it('[US-006:AC5] should allow credentials only for the configured origins', async () => {
    const http = await start();
    const allowed = await http
      .options('/api/v1/probe/echo')
      .set('Origin', 'https://torre.example')
      .set('Access-Control-Request-Method', 'POST');
    const other = await http
      .options('/api/v1/probe/echo')
      .set('Origin', 'https://evil.example')
      .set('Access-Control-Request-Method', 'POST');

    expect(allowed.headers['access-control-allow-origin']).toBe('https://torre.example');
    expect(allowed.headers['access-control-allow-credentials']).toBe('true');
    expect(other.headers['access-control-allow-origin']).toBeUndefined();
    const simple = await http.get('/api/v1/probe/ok').set('Origin', 'https://torre.example');
    expect(simple.headers['access-control-expose-headers']).toContain('X-Correlation-Id');
  });
});

describe('body limit', () => {
  it('[US-006:AC5][DEC-075] should accept JSON up to BODY_LIMIT and answer 413 above it', async () => {
    const http = await start();
    const fits = await http.post('/api/v1/probe/echo').send({ data: 'x'.repeat(1_000_000) });
    const tooBig = await http.post('/api/v1/probe/echo').send({ data: 'x'.repeat(1_100_000) });

    expect(fits.status).toBe(200);
    expect(fits.body).toEqual({ length: 1_000_000 });
    expect(tooBig.status).toBe(413);
    expect(JSON.parse(tooBig.text)).toMatchObject({ code: 'PAYLOAD_TOO_LARGE', status: 413 });
  });
});

describe('rate limit', () => {
  it('[US-006:AC5][DEC-062] should answer 429 RATE_LIMITED past API_THROTTLE_LIMIT per minute', async () => {
    const http = await start({ API_THROTTLE_LIMIT: '3' });
    const statuses: number[] = [];
    for (let i = 0; i < 3; i += 1) statuses.push((await http.get('/api/v1/probe/ok')).status);
    const limited = await http.get('/api/v1/probe/ok');

    expect(statuses).toEqual([200, 200, 200]);
    expect(limited.status).toBe(429);
    expect(JSON.parse(limited.text)).toMatchObject({ code: 'RATE_LIMITED', status: 429 });
    expect(Number(limited.headers['retry-after'])).toBeGreaterThan(0);
  });
});

describe('shutdown', () => {
  it('[US-006:AC5] should listen for termination signals to close cleanly', async () => {
    const before = process.listenerCount('SIGTERM');
    await start();

    expect(process.listenerCount('SIGTERM')).toBeGreaterThan(before);
  });
});
