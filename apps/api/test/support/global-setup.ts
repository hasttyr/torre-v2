import type { TestProject } from 'vitest/node';
import { createMigratedDatabase, dropDatabase, startPostgresServer, uniqueDatabaseName } from './postgres.js';

declare module 'vitest' {
  export interface ProvidedContext {
    /** Superuser URL of the integration server and the migrated template every suite copies (US-007:AC5). */
    postgres: { adminUrl: string; template: string };
  }
}

/**
 * Once per run: starts the server and migrates a template database from zero. Each suite then copies
 * the template (`createTestDatabase`), which takes milliseconds instead of a full migration.
 */
export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  const server = await startPostgresServer();
  const template = uniqueDatabaseName('torre_template');
  try {
    await createMigratedDatabase(server.adminUrl, template);
  } catch (error) {
    await dropDatabase(server.adminUrl, template);
    await server.stop();
    throw error;
  }
  project.provide('postgres', { adminUrl: server.adminUrl, template });
  return async () => {
    await dropDatabase(server.adminUrl, template);
    await server.stop();
  };
}
