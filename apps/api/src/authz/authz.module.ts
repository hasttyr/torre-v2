import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AuthorizationService } from './authorization.service.js';
import { AuthzController } from './authz.controller.js';
import { PermissionGuard } from './require-permission.js';

/**
 * Authorization (US-024, AUTHORIZATION.md §6): `AuthorizationService` for the fine checks of the
 * services, `PermissionGuard` behind `@RequirePermission()` and `GET /me/abilities` for the web.
 */
@Module({
  imports: [AuthModule],
  controllers: [AuthzController],
  providers: [AuthorizationService, PermissionGuard],
  exports: [AuthorizationService, PermissionGuard],
})
export class AuthzModule {}
