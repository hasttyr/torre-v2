import type { IncomingMessage, ServerResponse } from 'node:http';
import { ORPCModule } from '@orpc/nest';
import type { ORPCModuleConfig } from '@orpc/nest';
import {
  experimental_RethrowHandlerPlugin as RethrowHandlerPlugin,
  RequestHeadersPlugin,
  ResponseHeadersPlugin,
} from '@orpc/server/plugins';
import type { RequestHeadersPluginContext, ResponseHeadersPluginContext } from '@orpc/server/plugins';

declare module '@orpc/nest' {
  /** What every handler receives: request headers to read, response headers to set (US-008). */
  interface ORPCGlobalContext extends RequestHeadersPluginContext, ResponseHeadersPluginContext {}
}

type SendResponseInterceptor = Extract<NonNullable<ORPCModuleConfig['sendResponseInterceptors']>, unknown[]>[number];

/** RFC 9110 §13.1.2: `If-None-Match` lists entity tags (or `*`), compared weakly. */
export function etagMatches(ifNoneMatch: string, etag: string): boolean {
  const opaque = (tag: string) => tag.trim().replace(/^W\//, '');
  return ifNoneMatch.split(',').some((tag) => tag.trim() === '*' || opaque(tag) === opaque(etag));
}

/**
 * Conditional GET for every contract (ARCHITECTURE.md §9.1): a handler sets `etag` in `resHeaders`;
 * when the client already has that version the API answers 304 without a body.
 */
const conditionalGet: SendResponseInterceptor = (options) => {
  const request = options.request as IncomingMessage;
  const response = options.response as ServerResponse;
  const { status, headers } = options.standardResponse;
  const etag = headers['etag'];
  const ifNoneMatch = request.headers['if-none-match'];
  if (
    (request.method === 'GET' || request.method === 'HEAD') &&
    status === 200 &&
    typeof etag === 'string' &&
    typeof ifNoneMatch === 'string' &&
    etagMatches(ifNoneMatch, etag)
  ) {
    // Nothing is sent here: Nest replies next through Express, whose freshness check sees the ETag
    // and the matching If-None-Match and answers 304 without a body.
    response.setHeader('etag', etag);
    return Promise.resolve(undefined);
  }
  return options.next();
};

/**
 * oRPC inside Nest (DEC-060, ADR-0002). Every error a handler throws, validation included, goes back
 * to Nest so ProblemDetailsFilter answers it as problem+json, like any other route (US-006).
 */
export const ApiOrpcModule = ORPCModule.forRoot({
  // Initial context, shared and never mutated: the plugins copy it per request and add the headers.
  context: {},
  plugins: [new RequestHeadersPlugin(), new ResponseHeadersPlugin(), new RethrowHandlerPlugin({ filter: () => true })],
  sendResponseInterceptors: [conditionalGet],
});
