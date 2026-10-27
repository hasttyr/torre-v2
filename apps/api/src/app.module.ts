import { Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';
import { LoggingModule } from './common/logging.module.js';
import { ThrottlingModule } from './common/throttling.module.js';
import type { LoggingOptions } from './common/logging.module.js';
import { AppConfigModule } from './config/config.module.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './health/health.module.js';
import type { AppConfigOptions } from './config/config.module.js';

export type AppOptions = AppConfigOptions & LoggingOptions;

/** Root module: configuration (US-005), the cross-cutting layer (US-006) and the database (US-007). */
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
        HealthModule,
      ],
    };
  }
}
