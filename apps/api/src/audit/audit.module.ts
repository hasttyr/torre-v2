import { Module } from '@nestjs/common';
import { RequestMeta } from '../common/request-meta.js';
import { AuditLog } from './audit-log.js';

/** The `audit` module (ARCHITECTURE.md §6): the trail outside the tournament streams, security events today. */
@Module({
  providers: [AuditLog, RequestMeta],
  exports: [AuditLog, RequestMeta],
})
export class AuditModule {}
