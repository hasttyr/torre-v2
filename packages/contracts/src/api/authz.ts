import { oc } from '@orpc/contract';
import { z } from 'zod';

/**
 * `GET /me/abilities` (US-024:AC8): the CASL rules of the account, packed with `packRules` of
 * `@casl/ability/extra`, for `@casl/vue` in the web. Only to show or hide controls: the API checks every
 * action again (AUTHORIZATION.md §1).
 */
export const abilities = oc
  .route({ method: 'GET', path: '/me/abilities', operationId: 'myAbilities', tags: ['authz'] })
  .output(
    z.strictObject({
      /** Packed rules: `[action, subject, conditions?, inverted?, fields?, reason?]`. */
      rules: z.array(z.array(z.unknown())),
    }),
  );

export const authzContract = { abilities };
