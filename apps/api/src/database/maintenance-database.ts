import { Inject, Injectable } from '@nestjs/common';
import type { OnModuleDestroy } from '@nestjs/common';
import { AppConfig } from '../config/app-config.js';
import { createPrismaClient } from './prisma.js';
import type { PrismaClient } from './prisma.js';

/**
 * The maintenance role (`DATABASE_MAINTENANCE_URL`, DEC-078): BYPASSRLS, but privileges only on the
 * tables the `maintenance` queue purges (each one grants them in its own migration). Only the worker
 * has it, and only maintenance processors use it (US-117:AC4).
 */
@Injectable()
export class MaintenanceDatabase implements OnModuleDestroy {
  readonly client: PrismaClient;

  constructor(@Inject(AppConfig) config: AppConfig) {
    const url = config.get('DATABASE_MAINTENANCE_URL');
    // The environment schema requires it with WORKER=true (US-005); this guards a wrong wiring.
    if (url === undefined) throw new Error('DATABASE_MAINTENANCE_URL is required in the worker');
    this.client = createPrismaClient(url);
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }
}
