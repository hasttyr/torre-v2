import { isErrorCode } from '@torre/contracts';
import type { ErrorCode, FieldError } from '@torre/contracts';
import type { DomainError } from '@torre/core';

export interface ApiErrorOptions {
  /** Shown to the client: never internal details, personal data or secrets. */
  readonly detail?: string;
  readonly errors?: readonly FieldError[];
  /** Sent as the `Retry-After` header (429 answers), not in the body. */
  readonly retryAfterSeconds?: number;
}

/** An expected error with a code of the catalog (US-006:AC3); the global filter turns it into problem+json. */
export class ApiError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly options: ApiErrorOptions = {},
  ) {
    super(code);
    this.name = 'ApiError';
  }
}

/** `throw apiError('NOT_FOUND')` */
export const apiError = (code: ErrorCode, options?: ApiErrorOptions): ApiError => new ApiError(code, options);

/**
 * The HTTP side of a domain failure (CONVENTIONS.md §6): same code, no details, because they may carry
 * internal identifiers. A code missing from the catalog is a programming error and ends as a 500.
 */
export function fromDomainError(error: DomainError): Error {
  return isErrorCode(error.code)
    ? new ApiError(error.code)
    : new Error(`domain code ${error.code} is not in the catalog`);
}
