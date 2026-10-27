import { Controller, Inject, UseGuards } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import { deleteCookie, getCookie, setCookie } from '@orpc/server/helpers';
import { apiContract } from '@torre/contracts';
import { apiError } from '../common/api-error.js';
import { AppConfig } from '../config/app-config.js';
import { AuthContext } from './auth-context.js';
import { AuthLimiter } from './auth-limiter.js';
import { AuthService } from './auth.service.js';
import type { IssuedSession } from './auth.service.js';
import { Public } from './public.decorator.js';
import { SameSiteGuard } from './same-site.guard.js';
import { refreshCookie } from './tokens.js';

const { auth } = apiContract;

@Controller()
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly service: AuthService,
    @Inject(AuthContext) private readonly context: AuthContext,
    @Inject(AuthLimiter) private readonly limiter: AuthLimiter,
    @Inject(AppConfig) private readonly config: AppConfig,
  ) {}

  @Public()
  @Implement(auth.register)
  register() {
    return implement(auth.register).handler(async ({ input }) => {
      await this.limiter.attempt('register', this.context.clientAddress(), input.email);
      return this.service.register(input);
    });
  }

  /**
   * Wrong email and wrong password answer the same 401 (no account enumeration, US-022:AC1), and both
   * count toward the lock of that email (US-022:AC6). Only whoever has the password learns that the
   * account is suspended or anonymized (US-022:AC10).
   */
  @Public()
  @Implement(auth.login)
  login() {
    return implement(auth.login).handler(async ({ input, context }) => {
      await this.limiter.attempt('login', this.context.clientAddress(), input.email);
      const credentials = await this.service.verifyCredentials(input.email, input.password);
      if (!credentials) {
        await this.limiter.failed(input.email);
        throw apiError('UNAUTHENTICATED');
      }
      await this.limiter.succeeded(input.email);
      if (!credentials.active) return this.service.refuseLogin(credentials.userId);
      const userAgent = context.reqHeaders?.get('user-agent') ?? null;
      const session = await this.service.startSession(credentials.userId, userAgent);
      return this.signedIn(context.resHeaders, session);
    });
  }

  /** Public: the refresh cookie authenticates it, so it only accepts same-site requests (INV-A-4). */
  @Public()
  @UseGuards(SameSiteGuard)
  @Implement(auth.refresh)
  refresh() {
    return implement(auth.refresh).handler(async ({ context }) => {
      const session = await this.service.rotate(getCookie(context.reqHeaders, this.cookie().name));
      return this.signedIn(context.resHeaders, session);
    });
  }

  /** Public like refresh, so a user whose access token expired can still sign out; same-site only. */
  @Public()
  @UseGuards(SameSiteGuard)
  @Implement(auth.logout)
  logout() {
    return implement(auth.logout).handler(async ({ context }) => {
      const cookie = this.cookie();
      await this.service.endSession(getCookie(context.reqHeaders, cookie.name));
      deleteCookie(context.resHeaders, cookie.name, cookie.options);
      return { status: 204 as const };
    });
  }

  @Implement(auth.me)
  me() {
    return implement(auth.me).handler(() => this.service.account(this.context.principal().userId));
  }

  private cookie() {
    return refreshCookie(this.config.get('COOKIE_SECURE'));
  }

  /** The refresh token goes only to the cookie, which expires with the session; the body has the access token. */
  private signedIn(resHeaders: Headers | undefined, session: IssuedSession) {
    const cookie = this.cookie();
    setCookie(resHeaders, cookie.name, session.refreshToken, { ...cookie.options, expires: session.refreshExpiresAt });
    return { accessToken: session.accessToken, tokenType: 'Bearer' as const, expiresIn: session.expiresIn };
  }
}
