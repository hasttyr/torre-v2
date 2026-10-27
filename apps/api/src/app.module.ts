import { Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';
import { LoggingModule } from './common/logging.module.js';
import { ApiOrpcModule } from './common/orpc.module.js';
import { ThrottlingModule } from './common/throttling.module.js';
import type { LoggingOptions } from './common/logging.module.js';
import { AppConfigModule } from './config/config.module.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './health/health.module.js';
import { SystemModule } from './system/system.module.js';
import type { AppConfigOptions } from './config/config.module.js';

export type AppOptions = AppConfigOptions & LoggingOptions;

/** Root module: configuration (US-005), cross-cutting layer (US-006), database (US-007) and contracts (US-008). */
@Module({})
export class AppModule {
  static async forRoot(options: AppOptions = {}): Promise<DynamicModule> {
    return {
      module: AppModule,
      imports: [
        await AppConfigModule.forRoot(options),
        LoggingModule.forRoot(options),
        ThrottlingModule,
        DatabaseModule,
        ApiOrpcModule,
        HealthModule,
        SystemModule,
      ],
    };
  }
}
