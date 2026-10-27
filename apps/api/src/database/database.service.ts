import { Inject, Injectable } from '@nestjs/common';
import type { OnModuleDestroy } from '@nestjs/common';
import { AppConfig } from '../config/app-config.js';
import { createPrismaClient } from './prisma.js';
import type { PrismaClient } from './prisma.js';

/**
 * The database as the application role (`DATABASE_URL`, US-007:AC2): no DDL, no DELETE and, from
 * US-025, no BYPASSRLS. Migrations run with another role through the Prisma CLI (prisma.config.ts).
 */
@Injectable()
export class DatabaseService implements OnModuleDestroy {
  readonly client: PrismaClient;

  constructor(@Inject(AppConfig) config: AppConfig) {
    this.client = createPrismaClient(config.get('DATABASE_URL'));
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }
}
