// @vitest-environment node
// The client needs no DOM; Node's fetch is the one MSW intercepts.
import { QueryClient, useQuery, VueQueryPlugin } from '@tanstack/vue-query';
import { ERROR_CODES } from '@torre/contracts';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp, effectScope } from 'vue';
import es from '../../locales/es.json';
import { createApiClient, createQueryUtils } from './client.js';
import { NETWORK_ERROR, problemMessageKey, toApiProblem } from './problem.js';

const BASE = 'http://api.test/api/v1';
const server = setupServer();
const seen: Request[] = [];

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
  server.events.on('request:start', ({ request }) => {
    seen.push(request.clone());
  });
});
afterEach(() => {
  server.resetHandlers();
  seen.length = 0;
});
afterAll(() => server.close());

const problem = (status: number, code: string) =>
  HttpResponse.json(
    { type: 'about:blank', title: code, status, code, correlationId: 'corr-123' },
    { status, headers: { 'content-type': 'application/problem+json' } },
  );

const messageOf = (key: string): unknown =>
  key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], es);

describe('API client (US-009)', () => {
  it('[US-009:AC3] should call the configured base URL with a new correlation id per request', async () => {
    server.use(http.get(`${BASE}/ping`, () => HttpResponse.json({ pong: true })));
    const api = createApiClient({ baseUrl: BASE });

    expect(await api.system.ping()).toEqual({ pong: true });
    await api.system.ping();
    const [first, second] = seen.map((r) => r.headers.get('x-correlation-id'));
    expect(first).toMatch(/^[0-9a-f-]{36}$/);
    expect(second).not.toBe(first);
  });

  it('[US-009:AC3] should turn problem+json into a code to translate and the id for support', async () => {
    server.use(http.get(`${BASE}/ping`, () => problem(409, 'GAME_ALREADY_HAS_RESULT')));
    const api = createApiClient({ baseUrl: BASE });

    const result = toApiProblem(await api.system.ping().catch((e: unknown) => e));

    expect(result).toMatchObject({ code: 'GAME_ALREADY_HAS_RESULT', status: 409, correlationId: 'corr-123' });
    expect(messageOf(problemMessageKey(result))).toBe(
      'La partida ya tiene resultado. Usa la corrección de resultados.',
    );
  });

  it('[US-009:AC3] should report a request that never reached the API as a network error', async () => {
    server.use(http.get(`${BASE}/ping`, () => HttpResponse.error()));
    const api = createApiClient({ baseUrl: BASE });

    expect(toApiProblem(await api.system.ping().catch((e: unknown) => e)).code).toBe(NETWORK_ERROR);
  });

  it('[US-009:AC3] should have a Spanish message for every error code of the API', () => {
    const missing = [...ERROR_CODES, NETWORK_ERROR].filter((code) => typeof messageOf(`errors.${code}`) !== 'string');

    expect(missing).toEqual([]);
  });

  it('[US-009:AC3] should refresh the session once on 401 and repeat the request', async () => {
    let calls = 0;
    server.use(
      http.get(`${BASE}/ping`, () =>
        ++calls === 1 ? problem(401, 'UNAUTHENTICATED') : HttpResponse.json({ pong: true }),
      ),
    );
    let refreshes = 0;
    const api = createApiClient({ baseUrl: BASE, refreshSession: () => Promise.resolve(++refreshes > 0) });

    expect(await api.system.ping()).toEqual({ pong: true });
    expect(refreshes).toBe(1);

    server.use(http.get(`${BASE}/ping`, () => problem(401, 'UNAUTHENTICATED')));
    const expired = createApiClient({ baseUrl: BASE, refreshSession: () => Promise.resolve(false) });
    expect(toApiProblem(await expired.system.ping().catch((e: unknown) => e)).code).toBe('UNAUTHENTICATED');
  });

  it('[US-009:AC3] should refetch a query when its contract key is invalidated (@orpc/vue-query, US-008)', async () => {
    let calls = 0;
    server.use(
      http.get(`${BASE}/ping`, () => {
        calls += 1;
        return HttpResponse.json({ pong: true });
      }),
    );
    const orpc = createQueryUtils(createApiClient({ baseUrl: BASE }));
    const queryClient = new QueryClient();
    // What a mounted component does: useQuery inside the app's injection context and an effect scope.
    const app = createApp({ render: () => null }).use(VueQueryPlugin, { queryClient });
    const scope = effectScope();
    const query = app.runWithContext(() => scope.run(() => useQuery(orpc.system.ping.queryOptions())));
    await vi.waitFor(() => expect(query?.data.value).toEqual({ pong: true }));

    await queryClient.invalidateQueries({ queryKey: orpc.system.key() });
    await vi.waitFor(() => expect(calls).toBe(2));
    scope.stop();
  });
});
