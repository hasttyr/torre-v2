// Public API of @torre/contracts: the oRPC contracts of the HTTP API (US-008), error codes and the
// problem+json shape (US-006). WebSocket messages arrive with US-050.
export { API_BASE_PATH, apiContract } from './api/index.js';
export type { ApiContract, ApiInputs, ApiOutputs } from './api/index.js';
export { ERROR_CATALOG, ERROR_CODES, isErrorCode, PROBLEM_CONTENT_TYPE } from './errors.js';
export type { ErrorCode, FieldError, ProblemDetails } from './errors.js';
