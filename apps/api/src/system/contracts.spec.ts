import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { Controller, Injectable, RequestMethod, UseGuards } from '@nestjs/common';
import type { CanActivate, INestApplication } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants.js';
import { ModulesContainer } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { createORPCClient, ORPCError } from '@orpc/client';
import type { ContractRouterClient } from '@orpc/contract';
import { isContractProcedure, oc } from '@orpc/contract';
import { Implement, implement, toNestPattern } from '@orpc/nest';
import { OpenAPILink } from '@orpc/openapi-client/fetch';
import { getCookie } from '@orpc/server/helpers';
import { API_BASE_PATH, apiContract } from '@torre/contracts';
import type { ApiContract } from '@torre/contracts';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { stubExampleEnv } from '../__tests__/env.js';
import { Public } from '../auth/public.decorator.js';
import { apiError } from '../common/api-error.js';
import { etagMatches } from '../common/orpc.module.js';
import { AppModule } from '../app.module.js';
import { APP_OPTIONS, configureApp, OUTSIDE_PREFIX } from '../app.setup.js';
import { openApiDocument } from './openapi.js';

const ITEM = '0190c2a8-7a3b-7c1d-8e2f-3a4b5c6d7e8f';
const IDEMPOTENT_REQUEST = '0190c2a8-7a3b-7c1d-9e2f-3a4b5c6d7e90';

/** A contract that exists only in this test: the checklist of ADR-0002 on a real Nest app. */
const probe = {
  read: oc
    .route({ method: 'GET', path: '/probe/items/{id}' })
    .input(z.strictObject({ id: z.uuid() }))
    .output(z.strictObject({ id: z.uuid(), correlationId: z.string(), session: z.string().nullable() })),
  create: oc
    .route({ method: 'POST', path: '/probe/items', inputStructure: 'detailed', successStatus: 201 })
    .input(
      z.object({
        headers: z.object({ 'idempotency-key': z.uuid() }),
        body: z.strictObject({ name: z.string().min(1).max(40) }),
      }),
    )
    .output(z.strictObject({ idempotencyKey: z.uuid(), name: z.string() })),
  missing: oc.route({ method: 'GET', path: '/probe/missing' }).output(z.strictObject({})),
  broken: oc.route({ method: 'GET', path: '/probe/broken' }).output(z.strictObject({ ok: z.literal(true) })),
  guarded: oc.route({ method: 'GET', path: '/probe/guarded' }).output(z.strictObject({})),
};

@Injectable()
class DenyGuard implements CanActivate {
  canActivate(): boolean {
    return false;
  }
}

@Public()
@Controller()
class ProbeController {
  @Implement(probe.read)
  read() {
    return implement(probe.read).handler(({ input, context }) => {
      context.resHeaders?.set('etag', '"v1"');
      return {
        id: input.id,
        correlationId: context.reqHeaders?.get('x-correlation-id') ?? '',
        session: getCookie(context.reqHeaders, 'session') ?? null,
      };
    });
  }

  @Implement(probe.create)
  create() {
    return implement(probe.create).handler(({ input }) => ({
      idempotencyKey: input.headers['idempotency-key'],
      name: input.body.name,
    }));
  }

  @Implement(probe.missing)
  missing() {
    return implement(probe.missing).handler(() => {
      throw apiError('NOT_FOUND', { detail: 'No such item' });
    });
  }

  @Implement(probe.broken)
  broken() {
    // Breaks its own output contract on purpose.
    return implement(probe.broken).handler(() => ({ ok: 'yes' }) as unknown as { ok: true });
  }

  @UseGuards(DenyGuard)
  @Implement(probe.guarded)
  guarded() {
    return implement(probe.guarded).handler(() => ({}));
  }
}

let app: INestApplication | undefined;

async function start(options: { probe?: boolean; env?: Record<string, string> } = {}) {
  stubExampleEnv({ LOG_LEVEL: 'silent', ...options.env });
  const moduleRef = await Test.createTestingModule({
    imports: [await AppModule.forRoot({ ignoreEnvFile: true, counters: 'memory' })],
    controllers: options.probe ? [ProbeController] : [],
    providers: options.probe ? [DenyGuard] : [],
  }).compile();
  app = configureApp(moduleRef.createNestApplication<NestExpressApplication>(APP_OPTIONS));
  await app.init();
  return request(app.getHttpServer() as Server);
}

afterEach(async () => {
  await app?.close();
  app = undefined;
  vi.unstubAllEnvs();
});

/** `METHOD path` of every route Nest registered, with the global prefix. */
function nestRoutes(nest: INestApplication): string[] {
  const routes: string[] = [];
  for (const module of nest.get(ModulesContainer).values()) {
    for (const { metatype } of module.controllers.values()) {
      if (typeof metatype !== 'function') continue;
      const base = String(Reflect.getMetadata(PATH_METADATA, metatype) ?? '');
      const proto = metatype.prototype as Record<string, unknown>;
      for (const name of Object.getOwnPropertyNames(proto).filter((n) => n !== 'constructor')) {
        const handler = proto[name];
        if (typeof handler !== 'function' || !Reflect.hasMetadata(PATH_METADATA, handler)) continue;
        const method = RequestMethod[Reflect.getMetadata(METHOD_METADATA, handler) as RequestMethod];
        const path = [base, String(Reflect.getMetadata(PATH_METADATA, handler))]
          .map((p) => p.replace(/^\/+|\/+$/g, ''))
          .filter(Boolean)
          .join('/');
        routes.push(`${method} ${OUTSIDE_PREFIX.includes(path) ? '' : API_BASE_PATH}/${path}`);
      }
    }
  }
  return routes.sort();
}

/** `METHOD path` of every operation in the contract router. */
function contractRoutes(router: unknown): string[] {
  if (isContractProcedure(router)) {
    const { method = 'POST', path = '/' } = router['~orpc'].route;
    return [`${method} ${API_BASE_PATH}${toNestPattern(path)}`];
  }
  return Object.values(router as Record<string, unknown>).flatMap(contractRoutes);
}

describe('contracts (US-008)', () => {
  it('[US-008:AC5] should answer GET /api/v1/ping from its contract', async () => {
    const http = await start();
    const res = await http.get('/api/v1/ping');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ pong: true });
    expect(res.headers['x-correlation-id']).toBeTruthy();
  });

  it('[US-008:AC1] should fail when an API operation does not come from the contracts', async () => {
    await start();
    const served = nestRoutes(app!);
    const declared = contractRoutes(apiContract);
    const outside = OUTSIDE_PREFIX.map((p) => `GET /${p}`);

    expect(declared.length).toBeGreaterThan(0);
    expect(served.filter((r) => !declared.includes(r) && !outside.includes(r))).toEqual([]);
    expect(declared.filter((r) => !served.includes(r))).toEqual([]);
  });

  it('[US-008:AC2][TC-046] should reject unknown fields and missing headers as VALIDATION_FAILED per field', async () => {
    const http = await start({ probe: true });
    const unknown = await http
      .post('/api/v1/probe/items')
      .set('idempotency-key', IDEMPOTENT_REQUEST)
      .send({ name: 'Mesa 1', extra: true });
    const noKey = await http.post('/api/v1/probe/items').send({ name: 'Mesa 1' });

    expect(unknown.status).toBe(400);
    expect(unknown.headers['content-type']).toMatch(/^application\/problem\+json/);
    expect(unknown.body).toMatchObject({
      code: 'VALIDATION_FAILED',
      errors: [{ path: 'body.extra', code: 'unrecognized_keys' }],
    });
    expect((noKey.body as { errors: unknown[] }).errors).toEqual([
      expect.objectContaining({ path: 'headers.idempotency-key' }),
    ]);
  });

  it('[US-008:AC2] should give handlers the Idempotency-Key, the correlation id and the cookies', async () => {
    const http = await start({ probe: true });
    const created = await http
      .post('/api/v1/probe/items')
      .set('idempotency-key', IDEMPOTENT_REQUEST)
      .send({ name: 'Mesa 1' });
    const read = await http
      .get(`/api/v1/probe/items/${ITEM}`)
      .set('x-correlation-id', 'req-42')
      .set('cookie', 'session=abc');

    expect(created.status).toBe(201);
    expect(created.body).toEqual({ idempotencyKey: IDEMPOTENT_REQUEST, name: 'Mesa 1' });
    expect(read.body).toEqual({ id: ITEM, correlationId: 'req-42', session: 'abc' });
  });

  it('[US-008:AC2] should answer 304 when If-None-Match carries the current ETag', async () => {
    const http = await start({ probe: true });
    const first = await http.get(`/api/v1/probe/items/${ITEM}`);
    const again = await http.get(`/api/v1/probe/items/${ITEM}`).set('if-none-match', String(first.headers['etag']));
    const stale = await http.get(`/api/v1/probe/items/${ITEM}`).set('if-none-match', '"v0"');

    expect(first.headers['etag']).toBe('"v1"');
    expect(again.status).toBe(304);
    expect(again.text).toBe('');
    expect(stale.status).toBe(200);
    expect(etagMatches('W/"v1", "v2"', '"v1"')).toBe(true);
    expect(etagMatches('*', '"v9"')).toBe(true);
  });

  it('[US-008:AC2] should answer handler errors, guards and broken outputs as problem+json', async () => {
    const http = await start({ probe: true });
    const missing = await http.get('/api/v1/probe/missing');
    const guarded = await http.get('/api/v1/probe/guarded');
    const broken = await http.get('/api/v1/probe/broken');

    expect(missing.status).toBe(404);
    expect(missing.body).toMatchObject({ code: 'NOT_FOUND', detail: 'No such item' });
    expect(guarded.status).toBe(403);
    expect(guarded.body).toMatchObject({ code: 'FORBIDDEN' });
    expect(broken.status).toBe(500);
    expect(broken.body).toEqual(expect.objectContaining({ code: 'INTERNAL_ERROR' }));
    expect(JSON.stringify(broken.body)).not.toContain('yes');
  });

  it('[US-008:AC2][TC-046] should keep the committed OpenAPI document equal to the generated one', async () => {
    // A contract change shows up in review as a diff of this file; `vitest -u` rewrites it.
    const generated = `${JSON.stringify(await openApiDocument(), null, 2)}
`;

    await expect(generated).toMatchFileSnapshot('../../../../packages/contracts/openapi.json');
  });

  it('[US-008:AC4] should serve the OpenAPI document at /api/docs outside production only', async () => {
    const http = await start();
    const docs = await http.get('/api/docs');

    expect(docs.status).toBe(200);
    const body = docs.body as {
      openapi: string;
      servers: unknown;
      paths: Record<string, { get?: { operationId?: string } }>;
    };
    expect(body.openapi).toMatch(/^3\.1/);
    expect(body.servers).toEqual([{ url: '/api/v1' }]);
    expect(body.paths['/ping']?.get?.operationId).toBe('ping');
    await app?.close();

    const prod = await start({ env: { NODE_ENV: 'production', COOKIE_SECURE: 'true' } });
    expect((await prod.get('/api/docs')).status).toBe(404);
  });

  it('[US-008:AC2][TC-046] should type a client against the real server', async () => {
    await start({ probe: true });
    const server = app!.getHttpServer() as Server;
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as AddressInfo;
    const url = `http://127.0.0.1:${port}${API_BASE_PATH}`;
    const client: ContractRouterClient<ApiContract> = createORPCClient(new OpenAPILink(apiContract, { url }));
    const probeClient: ContractRouterClient<typeof probe> = createORPCClient(new OpenAPILink(probe, { url }));

    const pong = await client.system.ping();
    const failure = await probeClient.missing().catch((error: unknown) => error);

    expect(pong).toEqual({ pong: true });
    expect(failure).toBeInstanceOf(ORPCError);
    expect((failure as ORPCError<string, unknown>).status).toBe(404);
  });
});
