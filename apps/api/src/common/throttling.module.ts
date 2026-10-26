import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppConfig } from '../config/app-config.js';

const ONE_MINUTE_MS = 60_000;

/**
 * General rate limit of the API (US-006:AC5, DEC-062): `API_THROTTLE_LIMIT` requests per minute and
 * client. The counters live in memory, which is right for a single instance only; the shared Redis
 * storage of ARCHITECTURE.md §3 arrives with US-022, together with the per-account limits.
 */
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      inject: [AppConfig],
      useFactory: (config: AppConfig) => ({
        // `default` keeps the standard header names (`Retry-After`, `X-RateLimit-*`) without a suffix.
        throttlers: [{ name: 'default', ttl: ONE_MINUTE_MS, limit: config.get('API_THROTTLE_LIMIT') }],
      }),
    }),
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class ThrottlingModule {}
