import { Inject, Injectable } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { apiError } from '../common/api-error.js';
import { AuthContext } from './auth-context.js';
import type { Principal } from './auth-context.js';
import { IS_PUBLIC } from './public.decorator.js';

/**
 * Global guard (US-022:AC8): every route needs a valid access token unless it is `@Public()`. The
 * principal goes to the request context for the handlers.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AuthContext) private readonly auth: AuthContext,
  ) {
    super();
  }

  override async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    await super.canActivate(context);
    this.auth.set(context.switchToHttp().getRequest<{ user: Principal }>().user);
    return true;
  }

  /** Any failure (no token, bad signature, expired) is the same 401, without saying which. */
  override handleRequest<T = Principal>(error: unknown, user: T | false): T {
    if (error || !user) throw apiError('UNAUTHENTICATED');
    return user;
  }
}
