/**
 * Stable error codes of the API (DEC-019, CONVENTIONS.md §6). The client translates each code with i18n
 * (`errors.<CODE>`); `title` is the English fallback of `application/problem+json`. The table in
 * CONVENTIONS.md §6 is the source: `tools/error-catalog.test.mjs` keeps both in sync.
 */
export const ERROR_CATALOG = {
  VALIDATION_FAILED: { status: 400, title: 'Validation failed' },
  UNAUTHENTICATED: { status: 401, title: 'Authentication required' },
  FORBIDDEN: { status: 403, title: 'Forbidden' },
  NOT_FOUND: { status: 404, title: 'Not found' },
  VERSION_CONFLICT: { status: 409, title: 'Version conflict' },
  IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD: {
    status: 422,
    title: 'Idempotency key reused with a different payload',
  },
  INVALID_TRANSITION: { status: 409, title: 'Invalid state transition' },
  ROUND_NOT_PUBLISHED: { status: 409, title: 'Round not published' },
  ROUND_CLOSED: { status: 409, title: 'Round closed' },
  GAME_ALREADY_HAS_RESULT: { status: 409, title: 'Game already has a result' },
  NO_VALID_PAIRING: { status: 422, title: 'No valid pairing' },
  RULESET_NOT_APPROVED: { status: 422, title: 'Rule set not approved' },
  RULESET_PARAMETER_MISSING: { status: 422, title: 'Rule set parameter missing' },
  NOT_IMPLEMENTED_POLICY: { status: 501, title: 'Policy not implemented' },
  ELIGIBILITY_NOT_VERIFIED: { status: 422, title: 'Eligibility not verified' },
  ENTRY_QUOTA_EXCEEDED: { status: 422, title: 'Entry quota exceeded' },
  CLAIM_OUT_OF_TIME: { status: 422, title: 'Claim out of time' },
  ROLE_REQUEST_DUPLICATE: { status: 409, title: 'Role request already pending' },
  ROLE_ALREADY_GRANTED: { status: 409, title: 'Role already granted' },
  ROLE_REQUEST_NOT_PENDING: { status: 409, title: 'Role request not pending' },
  PASSWORD_CONFIRMATION_REQUIRED: { status: 423, title: 'Password confirmation required' },
  TWO_FACTOR_CODE_INVALID: { status: 422, title: 'Invalid two-factor code' },
  ACCOUNT_SUSPENDED: { status: 403, title: 'Account suspended' },
  RESERVED_PERMISSION: { status: 422, title: 'Reserved permission' },
  RESTORE_CONFLICT: { status: 409, title: 'Restore conflict' },
  HAS_ACTIVE_TOURNAMENTS: { status: 409, title: 'Organization has active tournaments' },
  IDEMPOTENCY_REQUEST_IN_PROGRESS: { status: 409, title: 'Request with this idempotency key in progress' },
  TWO_FACTOR_REQUIRED: { status: 403, title: 'Two-factor authentication required' },
  PASSWORD_POLICY_VIOLATION: { status: 422, title: 'Password policy violation' },
  UNSUPPORTED_MEDIA_TYPE: { status: 415, title: 'Unsupported media type' },
  PAYLOAD_TOO_LARGE: { status: 413, title: 'Payload too large' },
  VISIBILITY_EXCEEDS_TOURNAMENTS: { status: 422, title: 'Visibility exceeds the tournaments' },
  TPN_LOCKED: { status: 409, title: 'Initial ranking locked' },
  CHECK_IN_NOT_CLOSED: { status: 409, title: 'Check-in not closed' },
  CHECK_IN_CLOSED: { status: 409, title: 'Check-in closed' },
  RATE_LIMITED: { status: 429, title: 'Too many requests' },
  INTERNAL_ERROR: { status: 500, title: 'Internal error' },
} as const satisfies Readonly<Record<string, { readonly status: number; readonly title: string }>>;

export type ErrorCode = keyof typeof ERROR_CATALOG;

export const ERROR_CODES = Object.keys(ERROR_CATALOG) as ErrorCode[];

export const isErrorCode = (value: string): value is ErrorCode => Object.hasOwn(ERROR_CATALOG, value);

/** A field-level problem inside `errors[]`. */
export interface FieldError {
  readonly path: string;
  readonly code: string;
  readonly message: string;
}

/** Body of every error response, `application/problem+json` (RFC 9457, CONVENTIONS.md §6). */
export interface ProblemDetails {
  readonly type: 'about:blank';
  readonly title: string;
  readonly status: number;
  readonly code: ErrorCode;
  readonly detail?: string;
  readonly correlationId: string;
  readonly errors?: readonly FieldError[];
}

export const PROBLEM_CONTENT_TYPE = 'application/problem+json';
