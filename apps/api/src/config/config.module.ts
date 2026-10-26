import { fileURLToPath } from 'node:url';
import { Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppConfig } from './app-config.js';
import { parseEnv } from './env.schema.js';

/** `.env` in the API folder, then at the repository root (local runs); the same depth from `src` and `dist`. */
const ENV_FILES = ['../../.env', '../../../../.env'].map((path) => fileURLToPath(new URL(path, import.meta.url)));

export interface AppConfigOptions {
  /** Tests read only the process environment. */
  readonly ignoreEnvFile?: boolean;
}

@Module({})
export class AppConfigModule {
  /**
   * Validates the environment when the application is created, not when this file is imported: a
   * missing or invalid variable stops the start-up and every problem is listed (US-005:AC1).
   * `.env` files only fill what the process environment does not set.
   */
  static async forRoot(options: AppConfigOptions = {}): Promise<DynamicModule> {
    return {
      module: AppConfigModule,
      global: true,
      imports: [
        await ConfigModule.forRoot({
          envFilePath: ENV_FILES,
          ignoreEnvFile: options.ignoreEnvFile ?? false,
          validate: parseEnv,
          // ConfigService must serve validated values only, never a raw string from process.env.
          skipProcessEnv: true,
          cache: true,
        }),
      ],
      providers: [AppConfig],
      exports: [AppConfig],
    };
  }
}
