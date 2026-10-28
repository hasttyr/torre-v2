// Public API of shared/api (ARCHITECTURE.md §13.1): the one client every feature uses.
import { createApiClient, createQueryUtils } from './client.js';

const baseUrl = import.meta.env.VITE_API_BASE_URL;
if (!baseUrl) throw new Error('VITE_API_BASE_URL is not set (see .env.example)');

export const api = createApiClient({ baseUrl });
export const orpc = createQueryUtils(api);

export { createApiClient, createQueryUtils, newCorrelationId } from './client.js';
export type { ApiClient, ApiClientOptions } from './client.js';
export { NETWORK_ERROR, problemMessageKey, toApiProblem } from './problem.js';
export { roleLabelKey, scopeLabelKey } from './roles.js';
export type { ApiProblem } from './problem.js';
