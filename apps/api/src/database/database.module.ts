import { Global, Module } from '@nestjs/common';
import { TenantContext } from '../common/request-context.js';
import { DatabaseService } from './database.service.js';

/** Data access shared by every module (ARCHITECTURE.md §6.2, US-007), with the tenant of the request (US-025). */
@Global()
@Module({
  providers: [DatabaseService, TenantContext],
  exports: [DatabaseService, TenantContext],
})
export class DatabaseModule {}
