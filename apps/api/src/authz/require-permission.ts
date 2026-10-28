import { applyDecorators, Inject, Injectable, SetMetadata, UseGuards } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { PermissionKey } from '@torre/contracts';
import { AuthContext } from '../auth/auth-context.js';
import { apiError } from '../common/api-error.js';
import { AuthorizationService } from './authorization.service.js';

const REQUIRED_PERMISSION = 'torre:requiredPermission';

/**
 * The coarse check of a route (US-024:AC2): the account must hold `permission` in some scope. It runs
 * after the global JWT guard; the service then checks the loaded resource (`assertCan`).
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AuthContext) private readonly auth: AuthContext,
    @Inject(AuthorizationService) private readonly authz: AuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permission = this.reflector.get<PermissionKey | undefined>(REQUIRED_PERMISSION, context.getHandler());
    if (permission === undefined) return true;
    if (!(await this.authz.holds(this.auth.principal().userId, permission))) throw apiError('FORBIDDEN');
    return true;
  }
}

/** `@RequirePermission('game.record')` on a route: 403 `FORBIDDEN` unless the account holds it. */
export const RequirePermission = (permission: PermissionKey) =>
  applyDecorators(SetMetadata(REQUIRED_PERMISSION, permission), UseGuards(PermissionGuard));
