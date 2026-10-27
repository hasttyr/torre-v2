import type { InferContractRouterInputs, InferContractRouterOutputs } from '@orpc/contract';
import { authContract } from './auth.js';
import { systemContract } from './system.js';
import { userContract } from './user.js';

/**
 * Every operation of the HTTP API (DEC-060). Paths are relative to `/api/v1`. The API implements them
 * with `@orpc/nest`, the web consumes them with the oRPC client and the OpenAPI document comes from
 * here; an API route that is not in this router fails a test (US-008).
 */
export const apiContract = {
  system: systemContract,
  auth: authContract,
  user: userContract,
};

export type ApiContract = typeof apiContract;
export type ApiInputs = InferContractRouterInputs<ApiContract>;
export type ApiOutputs = InferContractRouterOutputs<ApiContract>;

/** Base path of every contract path (ARCHITECTURE.md §9.1). */
export const API_BASE_PATH = '/api/v1';
