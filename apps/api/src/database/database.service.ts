import { Inject, Injectable } from '@nestjs/common';
import type { OnModuleDestroy } from '@nestjs/common';
import { TenantContext } from '../common/request-context.js';
import { AppConfig } from '../config/app-config.js';
import { createPrismaClient } from './prisma.js';
import type { PrismaClient } from './prisma.js';
import { withTransaction } from './transaction.js';
import type { Transaction, TransactionContext } from './transaction.js';

/**
 * The database as the application role (`DATABASE_URL`, US-007:AC2): no DDL, no DELETE and, from
 * US-025, no BYPASSRLS. Migrations run with another role through the Prisma CLI (prisma.config.ts).
 */
@Injectable()
export class DatabaseService implements OnModuleDestroy {
  readonly client: PrismaClient;

  constructor(
    @Inject(AppConfig) config: AppConfig,
    @Inject(TenantContext) private readonly request: TenantContext,
  ) {
    this.client = createPrismaClient(config.get('DATABASE_URL'));
  }

  /**
   * Runs `work` in one transaction with the tenant context set (US-007:AC3): the tenant and the account
   * of the current request (US-025:AC3), unless `context` names them.
   */
  withTransaction<T>(work: (tx: Transaction) => Promise<T>, context?: TransactionContext): Promise<T> {
    return withTransaction(this.client, work, { ...this.request.current(), ...context });
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }
}
