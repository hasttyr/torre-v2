import { createHash, randomBytes } from 'node:crypto';

/** An opaque refresh token: 32 random bytes, base64url. It is not a JWT (US-022, notes for the AI). */
export const newRefreshToken = (): string => randomBytes(32).toString('base64url');

/** Only the SHA-256 of a refresh token is stored, so a database leak gives no usable token. */
export const hashRefreshToken = (token: string): string => createHash('sha256').update(token).digest('hex');

/**
 * The refresh cookie (BR-AUTH-02): `HttpOnly; Secure; SameSite=Strict; Path=/`, with the `__Host-`
 * prefix that also forbids a `Domain`. Browsers reject that prefix without `Secure`, so a local run
 * with COOKIE_SECURE=false uses another name.
 */
export function refreshCookie(secure: boolean) {
  return {
    name: secure ? '__Host-refresh' : 'torre-refresh-dev',
    options: { httpOnly: true, secure, sameSite: 'strict', path: '/' } as const,
  };
}
