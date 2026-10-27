import { oc } from '@orpc/contract';
import { z } from 'zod';

/**
 * Version of the data processing policy that registration accepts (BR-AUTH-03, US-111). Changing the
 * policy means a new version here, in the same commit as its text (docs/legal/).
 */
export const PRIVACY_POLICY_VERSION = '2026-10-27';

/** Locales the app speaks today (DEC-019, US-075: Spanish first). */
export const LOCALES = ['es'] as const;

// Emails compare lower-case: one live account per address (US-022:AC1).
const email = z.email().max(254).toLowerCase();
// The policy itself (15–64 characters, not a common password) answers PASSWORD_POLICY_VIOLATION from
// the server; the schema only bounds the size of the request.
const password = z.string().min(1).max(1024);

const account = z.strictObject({
  id: z.uuid(),
  email: z.email(),
  displayName: z.string(),
  locale: z.enum(LOCALES),
});

/** `POST /auth/register` (US-022:AC1): a viewer account, without memberships (BR-ROLE-01). */
export const register = oc
  .route({ method: 'POST', path: '/auth/register', successStatus: 201, operationId: 'register', tags: ['auth'] })
  .input(
    z.strictObject({
      email,
      password,
      displayName: z.string().trim().min(1).max(100),
      locale: z.enum(LOCALES),
      acceptedPrivacyPolicyVersion: z.string().min(1).max(32),
    }),
  )
  .output(account);

// What login and refresh answer: the access token in the body, the refresh token only in the cookie.
const accessToken = z.strictObject({
  accessToken: z.string(),
  tokenType: z.literal('Bearer'),
  /** Seconds until the access token expires. */
  expiresIn: z.number().int().positive(),
});

/**
 * `POST /auth/login` (US-022:AC3): a 5-minute access token in the body and the refresh token in the
 * `__Host-refresh` cookie, never in the body.
 */
export const login = oc
  .route({ method: 'POST', path: '/auth/login', operationId: 'login', tags: ['auth'] })
  .input(z.strictObject({ email, password }))
  .output(accessToken);

/**
 * `POST /auth/refresh` (US-022:AC4): trades the refresh cookie for a new access token and a new refresh
 * cookie. The old refresh token stops working, and using it again revokes the whole session (INV-A-1).
 * The session still ends 24 hours after the login (DEC-062). Same-site requests only (INV-A-4).
 */
export const refresh = oc
  .route({ method: 'POST', path: '/auth/refresh', operationId: 'refresh', tags: ['auth'] })
  .output(accessToken);

/** `GET /me`: the signed-in account (US-022:AC8, the first route behind the access token). */
export const me = oc.route({ method: 'GET', path: '/me', operationId: 'me', tags: ['auth'] }).output(account);

/**
 * `POST /auth/logout` (US-022:AC5): ends the session of the refresh cookie, its whole family, and clears
 * the cookie. It answers 204 even without a session, so repeating it is harmless. Same-site requests
 * only (INV-A-4).
 */
export const logout = oc
  // Detailed output: a 204 without a body, so the OpenAPI document declares no content.
  .route({ method: 'POST', path: '/auth/logout', outputStructure: 'detailed', operationId: 'logout', tags: ['auth'] })
  .output(z.strictObject({ status: z.literal(204).describe('Signed out') }));

export const authContract = { register, login, refresh, logout, me };
