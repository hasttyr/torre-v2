import { Inject, Injectable, Module } from '@nestjs/common';
import type { DynamicModule, OnApplicationBootstrap } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { Redis } from 'ioredis';
import { AppConfig } from '../config/app-config.js';
import { MaintenanceDatabase } from '../database/maintenance-database.js';
import { JobsService } from './jobs.service.js';
import { jobOptions, QUEUE_NAMES } from './queues.js';
import { assertNoEviction, redisConnection } from './redis.js';

export interface JobsOptions {
  /** The worker process (`WORKER=true`): runs processors and the maintenance role. */
  readonly worker: boolean;
  /** Key prefix in Redis; tests use one per suite. */
  readonly prefix?: string;
}

/** Checks Redis before the worker takes any job (US-117:AC5). */
@Injectable()
class NoEvictionCheck implements OnApplicationBootstrap {
  constructor(@Inject(AppConfig) private readonly config: AppConfig) {}

  async onApplicationBootstrap(): Promise<void> {
    const client = new Redis(this.config.get('REDIS_URL'), { lazyConnect: true, maxRetriesPerRequest: 1 });
    try {
      await client.connect();
      await assertNoEviction(client);
    } finally {
      client.disconnect();
    }
  }
}

/**
 * Queues of the platform (US-117, ARCHITECTURE.md §11). The API only produces jobs; processors are
 * registered by the feature modules that own each queue, in worker mode only.
 */
@Module({})
export class JobsModule {
  static forRoot(options: JobsOptions): DynamicModule {
    return {
      module: JobsModule,
      global: true,
      imports: [
        BullModule.forRootAsync({
          inject: [AppConfig],
          useFactory: (config: AppConfig) => ({
            connection: redisConnection(config.get('REDIS_URL'), { worker: options.worker }),
            prefix: options.prefix ?? 'torre',
          }),
        }),
        BullModule.registerQueue(...QUEUE_NAMES.map((name) => ({ name, defaultJobOptions: jobOptions(name) }))),
      ],
      providers: [JobsService, ...(options.worker ? [NoEvictionCheck, MaintenanceDatabase] : [])],
      exports: [JobsService, BullModule, ...(options.worker ? [MaintenanceDatabase] : [])],
    };
  }
}
