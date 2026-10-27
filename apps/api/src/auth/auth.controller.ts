import { Controller, Inject } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import { setCookie } from '@orpc/server/helpers';
import { apiContract } from '@torre/contracts';
import { apiError } from '../common/api-error.js';
import { AppConfig } from '../config/app-config.js';
import { AuthContext } from './auth-context.js';
import { AuthService } from './auth.service.js';
import { Public } from './public.decorator.js';
import { refreshCookie } from './tokens.js';

const { auth } = apiContract;

@Controller()
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly service: AuthService,
    @Inject(AuthContext) private readonly context: AuthContext,
    @Inject(AppConfig) private readonly config: AppConfig,
  ) {}

  @Public()
  @Implement(auth.register)
  register() {
    return implement(auth.register).handler(({ input }) => this.service.register(input));
  }

  /** Wrong email and wrong password answer the same 401 (no account enumeration, US-022:AC1). */
  @Public()
  @Implement(auth.login)
  login() {
    return implement(auth.login).handler(async ({ input, context }) => {
      const account = await this.service.verifyCredentials(input.email, input.password);
      if (!account) throw apiError('UNAUTHENTICATED');
      const session = await this.service.startSession(account.id, context.reqHeaders?.get('user-agent') ?? null);
      const cookie = refreshCookie(this.config.get('COOKIE_SECURE'));
      setCookie(context.resHeaders, cookie.name, session.refreshToken, {
        ...cookie.options,
        expires: session.refreshExpiresAt,
      });
      return { accessToken: session.accessToken, tokenType: 'Bearer' as const, expiresIn: session.expiresIn };
    });
  }

  @Implement(auth.me)
  me() {
    return implement(auth.me).handler(() => this.service.account(this.context.principal().userId));
  }
}
