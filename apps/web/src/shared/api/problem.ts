import { ORPCError } from '@orpc/client';
import { isErrorCode } from '@torre/contracts';
import type { ErrorCode, FieldError, ProblemDetails } from '@torre/contracts';

/** The request never reached the API (offline, DNS, CORS): not an API code, so it lives only here. */
export const NETWORK_ERROR = 'NETWORK_ERROR';

/** What the UI shows of a failed request (UI-UX.md §4): a code to translate and the id for support. */
export interface ApiProblem {
  readonly code: ErrorCode | typeof NETWORK_ERROR;
  readonly status?: number;
  readonly detail?: string;
  readonly correlationId?: string;
  readonly errors: readonly FieldError[];
}

const isProblemDetails = (data: unknown): data is ProblemDetails =>
  typeof data === 'object' &&
  data !== null &&
  typeof (data as { code?: unknown }).code === 'string' &&
  isErrorCode((data as { code: string }).code) &&
  typeof (data as { correlationId?: unknown }).correlationId === 'string';

/**
 * Any error of the API client as an `ApiProblem` (US-009:AC3). The API answers `problem+json`; the
 * oRPC client wraps it in an `ORPCError` that carries that body. Anything else that is not an
 * `ORPCError` failed before reaching the API.
 */
export function toApiProblem(error: unknown): ApiProblem {
  if (error instanceof ORPCError) {
    // The OpenAPI link keeps a body that is not in oRPC's own error format as `data.body`.
    const body: unknown = (error.data as { body?: unknown } | undefined)?.body ?? error.data;
    if (isProblemDetails(body)) {
      const { code, status, detail, correlationId, errors } = body;
      return { code, status, correlationId, errors: errors ?? [], ...(detail === undefined ? {} : { detail }) };
    }
    return { code: 'INTERNAL_ERROR', status: error.status, errors: [] };
  }
  return { code: NETWORK_ERROR, errors: [] };
}

/** The i18n key of a problem: `errors.<CODE>` (CONVENTIONS.md §6). */
export const problemMessageKey = (problem: ApiProblem): string => `errors.${problem.code}`;
