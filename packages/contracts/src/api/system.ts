import { oc } from '@orpc/contract';
import { z } from 'zod';

/**
 * `GET /api/v1/ping` (US-008:AC5): the smallest operation that crosses the whole stack, from this
 * contract to the Nest controller, the OpenAPI document and the typed client.
 */
export const ping = oc
  .route({
    method: 'GET',
    path: '/ping',
    operationId: 'ping',
    summary: 'Answer if the API serves its contracts',
    tags: ['system'],
  })
  .output(z.strictObject({ pong: z.literal(true) }));

export const systemContract = { ping };
