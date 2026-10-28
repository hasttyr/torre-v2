import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { GenericContainer } from 'testcontainers';
import pg from 'pg';
import { syncPermissions } from '../../src/authz/permissions-sync.js';
import { createPrismaClient } from '../../src/database/prisma.js';

const API_DIR = fileURLToPath(new URL('../../', import.meta.url));
const INIT_DIR = fileURLToPath(new URL('../../../../infra/postgres/init/', import.meta.url));
const PRISMA_CLI = fileURLToPath(new URL('../../node_modules/prisma/build/index.js', import.meta.url));

/** Same images as docker-compose.yml. */
export const POSTGRES_IMAGE = 'postgres:18';
export const VALKEY_IMAGE = 'valkey/valkey:8.1.10';

/** Development-only credentials of infra/postgres/init/01-roles.sql (and .env.example). */
export const ROLES = {
  app: { user: 'torre_app', password: 'torre_app_dev' },
  migration: { user: 'torre_migrator', password: 'torre_migrator_dev' },
  maintenance: { user: 'torre_maintenance', password: 'torre_maintenance_dev' },
} as const;

export interface PostgresServer {
  /** Superuser URL; its path is a database the setup may connect to. */
  readonly adminUrl: string;
  stop(): Promise<void>;
}

/**
 * The server of the integration suites (US-007:AC5): a Testcontainers container prepared with the
 * init scripts, or an existing server whose superuser URL is in `TEST_DATABASE_ADMIN_URL` (local runs
 * without Docker: the native cluster of `pnpm dev:infra`, which already has the roles).
 */
export async function startPostgresServer(): Promise<PostgresServer> {
  const existing = process.env['TEST_DATABASE_ADMIN_URL'];
  if (existing) return { adminUrl: existing, stop: () => Promise.resolve() };

  const container = await new PostgreSqlContainer(POSTGRES_IMAGE)
    .withDatabase('torre')
    .withUsername('postgres')
    .withPassword('torre_dev_postgres')
    .withCopyFilesToContainer(
      initScripts().map((name) => ({ source: `${INIT_DIR}${name}`, target: `/docker-entrypoint-initdb.d/${name}` })),
    )
    .start();
  return {
    adminUrl: container.getConnectionUri(),
    stop: async () => {
      await container.stop();
    },
  };
}

const initScripts = (): string[] =>
  readdirSync(INIT_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

export interface RedisServer {
  readonly url: string;
  stop(): Promise<void>;
}

/**
 * The Redis-compatible server of the integration suites (TC-081, US-117): `TEST_REDIS_URL` when set
 * (locally, the Valkey of `pnpm dev:infra`; use a database index of its own, such as `/15`), or a
 * Valkey container configured like docker-compose.yml.
 */
export async function startRedisServer(): Promise<RedisServer> {
  const existing = process.env['TEST_REDIS_URL'];
  if (existing) return { url: existing, stop: () => Promise.resolve() };
  const container = await new GenericContainer(VALKEY_IMAGE)
    .withCommand(['valkey-server', '--maxmemory-policy', 'noeviction', '--appendonly', 'yes'])
    .withExposedPorts(6379)
    .start();
  return {
    url: `redis://${container.getHost()}:${container.getMappedPort(6379)}`,
    stop: async () => {
      await container.stop();
    },
  };
}

/** `url` pointing at another database and, optionally, as another role. */
export function databaseUrl(url: string, database: string, role?: { user: string; password: string }): string {
  const target = new URL(url);
  target.pathname = `/${database}`;
  if (role) {
    target.username = role.user;
    target.password = role.password;
  }
  return target.toString();
}

/** Runs `sql` (one or many statements) on a short-lived connection. */
export async function execute(url: string, sql: string): Promise<void> {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
}

/** A database name that no other suite or run uses. */
export const uniqueDatabaseName = (prefix: string): string => `${prefix}_${randomUUID().replaceAll('-', '')}`;

/**
 * Creates an empty database prepared like the local one (02-database.sql) and applies every migration
 * with the migration role, exactly as a deployment does (`prisma migrate deploy`, then `permissions:sync`).
 */
export async function createMigratedDatabase(adminUrl: string, name: string): Promise<void> {
  // Idempotent: an existing server also gets the roles added after it was created.
  await execute(adminUrl, readFileSync(`${INIT_DIR}01-roles.sql`, 'utf8'));
  await execute(adminUrl, `CREATE DATABASE "${name}" OWNER torre_migrator`);
  const prepare = initScripts().filter((f) => !f.startsWith('01-'));
  for (const script of prepare)
    await execute(databaseUrl(adminUrl, name), readFileSync(`${INIT_DIR}${script}`, 'utf8'));
  migrateDeploy(databaseUrl(adminUrl, name, ROLES.migration));
  // As every deploy does after the migrations (US-024:AC1): the catalogue and the default matrix.
  const migrator = createPrismaClient(databaseUrl(adminUrl, name, ROLES.migration));
  try {
    await syncPermissions(migrator);
  } finally {
    await migrator.$disconnect();
  }
}

/** `prisma migrate deploy` against `migrationUrl`; throws with the CLI output when it fails. */
export function migrateDeploy(migrationUrl: string): void {
  const result = spawnSync(process.execPath, [PRISMA_CLI, 'migrate', 'deploy'], {
    cwd: API_DIR,
    env: { ...process.env, DATABASE_MIGRATION_URL: migrationUrl },
    encoding: 'utf8',
    timeout: 120_000,
  });
  if (result.status !== 0) throw new Error(`prisma migrate deploy failed:\n${result.stdout}\n${result.stderr}`);
}

/** Drops a test database, closing whatever connections are left open. */
export async function dropDatabase(adminUrl: string, name: string): Promise<void> {
  await execute(adminUrl, `DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
}
