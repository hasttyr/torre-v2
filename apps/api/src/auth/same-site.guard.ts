import type { IncomingHttpHeaders, IncomingMessage } from 'node:http';
import { Inject, Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { apiError } from '../common/api-error.js';
import { AppConfig } from '../config/app-config.js';

/** The origin of a header value, or undefined when it is not a URL (`Origin: null` included). */
const originOf = (value: string | undefined): string | undefined =>
  value !== undefined && URL.canParse(value) ? new URL(value).origin : undefined;

/**
 * Whether a request that the refresh cookie authenticates comes from the app itself (INV-A-4, DEC-091,
 * OWASP CSRF Prevention Cheat Sheet): `Sec-Fetch-Site: same-origin` passes and `cross-site` fails.
 * Anything else (`same-site`, `none`, a browser without Fetch Metadata) must show a trusted origin
 * in `Origin` or, when the browser sends no `Origin`, in `Referer`. Without either, the answer is no.
 */
export function isSameSiteRequest(headers: IncomingHttpHeaders, trustedOrigins: ReadonlySet<string>): boolean {
  const site = headers['sec-fetch-site'];
  if (site === 'same-origin') return true;
  if (site === 'cross-site') return false;
  const source = headers.origin === undefined ? originOf(headers.referer) : originOf(headers.origin);
  return source !== undefined && trustedOrigins.has(source);
}

/**
 * CSRF guard of `/auth/refresh` and `/auth/logout` (US-022:AC11): cross-site requests answer 403
 * FORBIDDEN. The trusted origins are the web app's: CORS_ORIGINS and PUBLIC_WEB_URL.
 */
@Injectable()
export class SameSiteGuard implements CanActivate {
  private readonly trustedOrigins: ReadonlySet<string>;

  constructor(@Inject(AppConfig) config: AppConfig) {
    this.trustedOrigins = new Set([...config.get('CORS_ORIGINS'), new URL(config.get('PUBLIC_WEB_URL')).origin]);
  }

  canActivate(context: ExecutionContext): boolean {
    const { headers } = context.switchToHttp().getRequest<IncomingMessage>();
    if (!isSameSiteRequest(headers, this.trustedOrigins)) throw apiError('FORBIDDEN');
    return true;
  }
}
