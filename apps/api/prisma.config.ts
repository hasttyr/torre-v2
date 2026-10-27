// Prisma CLI configuration (US-007). The CLI generates the client and migrates with the migration
// role (DATABASE_MIGRATION_URL); the application connects with DATABASE_URL (src/database).
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'prisma/config';

// Local runs read .env (API folder first, then the repository root); the process environment wins.
const envFile = ['.env', '../../.env']
  .map((path) => fileURLToPath(new URL(path, import.meta.url)))
  .find((path) => existsSync(path));
if (envFile) process.loadEnvFile(envFile);

const migrationUrl = process.env['DATABASE_MIGRATION_URL'];

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  // `prisma generate` needs no database, so CI can install without one.
  ...(migrationUrl ? { datasource: { url: migrationUrl } } : {}),
});
