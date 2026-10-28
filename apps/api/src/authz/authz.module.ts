import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AuthorizationService } from './authorization.service.js';
import { PermissionGuard } from './require-permission.js';

/**
 * Authorization (US-024, AUTHORIZATION.md §6): `AuthorizationService` for the fine checks of the
 * services and `PermissionGuard` behind `@RequirePermission()`.
 */
@Module({
  imports: [AuthModule],
  providers: [AuthorizationService, PermissionGuard],
  exports: [AuthorizationService, PermissionGuard],
})
export class AuthzModule {}
