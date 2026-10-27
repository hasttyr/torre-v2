import { createORPCClient, ORPCError } from '@orpc/client';
import type { ContractRouterClient } from '@orpc/contract';
import { OpenAPILink } from '@orpc/openapi-client/fetch';
import { createORPCVueQueryUtils } from '@orpc/vue-query';
import { apiContract } from '@torre/contracts';
import type { ApiContract } from '@torre/contracts';

export type ApiClient = ContractRouterClient<ApiContract>;

export interface ApiClientOptions {
  /** `VITE_API_BASE_URL`, e.g. `http://localhost:3000/api/v1`. */
  readonly baseUrl: string;
  /**
   * Called once when a request answers 401; when it resolves `true` the request is sent again. The
   * session refresh of US-022/US-066 plugs in here (`POST /auth/refresh` with the `__Host-refresh` cookie).
   */
  readonly refreshSession?: () => Promise<boolean>;
  /** Tests only. */
  readonly fetch?: (request: Request, init?: RequestInit) => Promise<Response>;
}

/** A new id per request, so the API logs and the UI error detail can be joined (US-006, US-009:AC3). */
export const newCorrelationId = (): string => crypto.randomUUID();

const isUnauthenticated = (error: unknown) => error instanceof ORPCError && error.status === 401;

/**
 * Errors arrive as `application/problem+json` (RFC 9457), which is JSON but which the oRPC client only
 * reads as a file; relabelled, the client parses it and puts the body in `ORPCError.data`.
 */
function asJson(response: Response): Response {
  if (!response.headers.get('content-type')?.startsWith('application/problem+json')) return response;
  const headers = new Headers(response.headers);
  headers.set('content-type', 'application/json');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

/** The typed client of every contract (DEC-060, ADR-0002). */
export function createApiClient({
  baseUrl,
  refreshSession,
  fetch = (request, init) => globalThis.fetch(request, init),
}: ApiClientOptions): ApiClient {
  const link = new OpenAPILink(apiContract, {
    url: baseUrl,
    headers: () => ({ 'x-correlation-id': newCorrelationId() }),
    // The refresh cookie travels only with credentials (ARCHITECTURE.md §12).
    fetch: async (request, init) => asJson(await fetch(request, { ...init, credentials: 'include' })),
    interceptors: [
      async (call) => {
        try {
          return await call.next();
        } catch (error) {
          if (isUnauthenticated(error) && refreshSession && (await refreshSession())) return call.next();
          throw error;
        }
      },
    ],
  });
  return createORPCClient(link);
}

/** Vue Query helpers of the client: `orpc.system.ping.queryOptions()`, keys to invalidate, mutations. */
export const createQueryUtils = (client: ApiClient) => createORPCVueQueryUtils(client);
