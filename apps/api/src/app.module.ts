import { Module } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import type { DynamicModule } from '@nestjs/common';
import { CountersModule } from './common/counters.module.js';
import type { CountersOptions } from './common/counters.module.js';
import { LoggingModule } from './common/logging.module.js';
import { ApiOrpcModule } from './common/orpc.module.js';
import { AuthModule } from './auth/auth.module.js';
import { AuthzModule } from './authz/authz.module.js';
import { ThrottlingModule } from './common/throttling.module.js';
import type { LoggingOptions } from './common/logging.module.js';
import { AppConfigModule } from './config/config.module.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './health/health.module.js';
import { JobsModule } from './jobs/jobs.module.js';
import { OrganizationsModule } from './organizations/organizations.module.js';
import type { JobsOptions } from './jobs/jobs.module.js';
import { SystemModule } from './system/system.module.js';
import type { AppConfigOptions } from './config/config.module.js';

export type AppOptions = AppConfigOptions &
  LoggingOptions &
  Partial<JobsOptions> & {
    /** Where the rate-limit counters live: Redis unless a unit test runs without it. */
    readonly counters?: CountersOptions['store'];
  };

/**
 * Root module: configuration (US-005), cross-cutting layer (US-006), database (US-007), contracts
 * (US-008), queues (US-117), authentication (US-022), authorization (US-024) and organizations (US-023). With `worker: true` it is
 * the worker process.
 */
@Module({})
export class AppModule {
  static async forRoot(options: AppOptions = {}): Promise<DynamicModule> {
    return {
      module: AppModule,
      imports: [
        await AppConfigModule.forRoot(options),
        LoggingModule.forRoot(options),
        // Request context (ARCHITECTURE.md §6.3): the principal today, the tenant with US-025.
        ClsModule.forRoot({ global: true, middleware: { mount: true } }),
        CountersModule.forRoot({ store: options.counters ?? 'redis', prefix: options.prefix ?? 'torre' }),
        ThrottlingModule,
        DatabaseModule,
        JobsModule.forRoot({
          worker: options.worker ?? false,
          ...(options.prefix === undefined ? {} : { prefix: options.prefix }),
        }),
        ApiOrpcModule,
        AuthModule,
        AuthzModule,
        OrganizationsModule,
        HealthModule,
        SystemModule,
      ],
    };
  }
}
