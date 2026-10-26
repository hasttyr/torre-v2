import { Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';
import { AppConfigModule } from './config/config.module.js';
import type { AppConfigOptions } from './config/config.module.js';

/** Root module. Logging, errors, health and security arrive with US-006. */
@Module({})
export class AppModule {
  static async forRoot(options: AppConfigOptions = {}): Promise<DynamicModule> {
    return { module: AppModule, imports: [await AppConfigModule.forRoot(options)] };
  }
}
