import { inject } from 'vitest';
import { syncPermissions } from '../../src/authz/permissions-sync.js';
import { createPrismaClient } from '../../src/database/prisma.js';
import type { PrismaClient } from '../../src/database/prisma.js';
import { databaseUrl, dropDatabase, execute, ROLES, uniqueDatabaseName } from './postgres.js';

export interface TestDatabase {
  readonly name: string;
  /** Application role (`DATABASE_URL`): what the API connects with. */
  readonly appUrl: string;
  /** Migration role (`DATABASE_MIGRATION_URL`). */
  readonly migrationUrl: string;
  /** Maintenance role (`DATABASE_MAINTENANCE_URL`, DEC-078). */
  readonly maintenanceUrl: string;
  /** Prisma Client as the application role. */
  readonly prisma: PrismaClient;
  /** Disconnects the client and drops the database. */
  dispose(): Promise<void>;
}

/**
 * A clean, migrated database for one suite (US-007:AC5): a copy of the template that the global setup
 * migrated from zero, with the permission catalogue synced (US-024). Call it in `beforeAll` and
 * `dispose()` in `afterAll`.
 */
export async function createTestDatabase(): Promise<TestDatabase> {
  const { adminUrl, template } = inject('postgres');
  const name = uniqueDatabaseName('torre_test');
  await execute(adminUrl, `CREATE DATABASE "${name}" TEMPLATE "${template}" OWNER torre_migrator`);
  const appUrl = databaseUrl(adminUrl, name, ROLES.app);
  const migrationUrl = databaseUrl(adminUrl, name, ROLES.migration);
  // As every deploy does after the migrations (US-024:AC1): the catalogue and the default matrix.
  const migrator = createPrismaClient(migrationUrl);
  try {
    await syncPermissions(migrator);
  } finally {
    await migrator.$disconnect();
  }
  const prisma = createPrismaClient(appUrl);
  return {
    name,
    appUrl,
    migrationUrl,
    maintenanceUrl: databaseUrl(adminUrl, name, ROLES.maintenance),
    prisma,
    dispose: async () => {
      await prisma.$disconnect();
      await dropDatabase(adminUrl, name);
    },
  };
}
