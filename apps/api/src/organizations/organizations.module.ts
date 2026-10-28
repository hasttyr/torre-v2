import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { OrganizationsController } from './organizations.controller.js';
import { OrganizationsService } from './organizations.service.js';

/**
 * Organizations (tenants) and memberships (US-023, AUTHORIZATION.md §2–§3). Direct role changes
 * (US-028), role requests (US-029) and invitations (US-026) join this module.
 */
@Module({
  imports: [AuditModule, AuthModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
})
export class OrganizationsModule {}
