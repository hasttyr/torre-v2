import { Inject, Injectable, Module } from '@nestjs/common';
import type { DynamicModule, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { Redis } from 'ioredis';
import { AppConfig } from '../config/app-config.js';
import { redisConnection } from '../jobs/redis.js';
import { MemoryRateCounter, RateCounter, RedisRateCounter } from './counters.js';
import { MemorySharedCache, RedisSharedCache, SharedCache } from './shared-cache.js';

export interface CountersOptions {
  /** `redis` everywhere but in unit tests that run without Redis. */
  readonly store: 'redis' | 'memory';
  /** Key prefix in Redis; tests use one per suite. */
  readonly prefix: string;
}

/**
 * The Redis connection of the counters: it fails fast (no offline queue), so a request never waits on
 * a Redis that is down; the rate limits then fail closed with a 500 (DEC-090).
 */
@Injectable()
class CountersConnection implements OnModuleInit, OnApplicationShutdown {
  readonly redis: Redis;

  constructor(@Inject(AppConfig) config: AppConfig) {
    this.redis = new Redis({ ...redisConnection(config.get('REDIS_URL'), { worker: false }), lazyConnect: true });
    // Failures reach the request that needs Redis and /health/ready; without a listener ioredis would
    // also print every reconnection attempt.
    this.redis.on('error', () => undefined);
  }

  async onModuleInit(): Promise<void> {
    // A Redis that is down at boot does not stop the API: ioredis keeps reconnecting.
    await this.redis.connect().catch(() => undefined);
  }

  onApplicationShutdown(): void {
    this.redis.disconnect();
  }
}

/**
 * State shared by every instance through Redis: the rate-limit counters (DEC-062) and the short caches
 * of `SharedCache` (DEC-104), on one connection.
 */
@Module({})
export class CountersModule {
  static forRoot(options: CountersOptions): DynamicModule {
    if (options.store === 'memory') {
      return {
        module: CountersModule,
        global: true,
        providers: [
          { provide: RateCounter, useValue: new MemoryRateCounter() },
          { provide: SharedCache, useValue: new MemorySharedCache() },
        ],
        exports: [RateCounter, SharedCache],
      };
    }
    return {
      module: CountersModule,
      global: true,
      providers: [
        CountersConnection,
        {
          provide: RateCounter,
          inject: [CountersConnection],
          useFactory: (connection: CountersConnection) => new RedisRateCounter(connection.redis, options.prefix),
        },
        {
          provide: SharedCache,
          inject: [CountersConnection],
          useFactory: (connection: CountersConnection) => new RedisSharedCache(connection.redis, options.prefix),
        },
      ],
      exports: [RateCounter, SharedCache],
    };
  }
}
