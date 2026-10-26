import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

export const CORRELATION_HEADER = 'x-correlation-id';

/** What a caller may send as its own id; anything else is replaced, so a header cannot inject log lines. */
const ACCEPTED = /^[A-Za-z0-9._:-]{1,128}$/;

export type WithCorrelationId = IncomingMessage & { correlationId?: string };

/** The caller's `X-Correlation-Id` when it is well formed, otherwise a new UUID (US-006:AC1). */
export function correlationIdOf(req: IncomingMessage): string {
  const given = req.headers[CORRELATION_HEADER];
  return typeof given === 'string' && ACCEPTED.test(given) ? given : randomUUID();
}

/** Gives every request its correlation id and returns it in the response header. */
export function correlationIdMiddleware(req: WithCorrelationId, res: ServerResponse, next: () => void): void {
  const id = req.correlationId ?? correlationIdOf(req);
  req.correlationId = id;
  res.setHeader(CORRELATION_HEADER, id);
  next();
}
