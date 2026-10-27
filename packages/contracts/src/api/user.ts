import { oc } from '@orpc/contract';
import { z } from 'zod';

/**
 * A live session of the signed-in account: one refresh family (BR-AUTH-02). The client address is only
 * kept as a keyed hash, so it is not part of the answer (DEC-096). Times are ISO 8601 in UTC
 * (CONVENTIONS.md §8).
 */
const session = z.strictObject({
  id: z.uuid(),
  createdAt: z.iso.datetime(),
  lastSeenAt: z.iso.datetime(),
  /** 24 hours after the login, whatever the rotations (DEC-062). */
  expiresAt: z.iso.datetime(),
  userAgent: z.string().nullable(),
  /** The session of the access token that asks. */
  current: z.boolean(),
});

/**
 * `GET /user/sessions` (US-022:AC9): the live sessions of the account, most recently used first. Revoked
 * and expired sessions are left out.
 */
export const sessions = oc
  .route({ method: 'GET', path: '/user/sessions', operationId: 'listSessions', tags: ['user'] })
  .output(z.array(session));

/**
 * `DELETE /user/other-sessions` (US-022:AC9): ends every live session of the account but the current one,
 * whose refresh tokens stop working at once. Access tokens already issued live out their 5 minutes
 * (DEC-062). Password confirmation arrives with US-107.
 */
export const revokeOtherSessions = oc
  .route({
    method: 'DELETE',
    path: '/user/other-sessions',
    outputStructure: 'detailed',
    operationId: 'revokeOtherSessions',
    tags: ['user'],
  })
  .output(z.strictObject({ status: z.literal(204).describe('Other sessions ended') }));

export const userContract = { sessions, revokeOtherSessions };
