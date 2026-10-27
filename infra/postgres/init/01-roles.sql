-- Development cluster bootstrap (US-003:AC2): the roles, shared by every database of the cluster.
-- Runs as the superuser and is idempotent: `pnpm dev:infra` runs it again on an existing cluster so new
-- roles reach it. Passwords are development-only values; never reuse them outside a local machine.
-- 02-database.sql prepares each database (US-007 runs it for every test database).
DO $$
BEGIN
  -- Migration role: owns the schema and runs Prisma migrations (DATABASE_MIGRATION_URL).
  -- CREATEDB lets `prisma migrate dev` create its shadow database.
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'torre_migrator') THEN
    CREATE ROLE torre_migrator LOGIN PASSWORD 'torre_migrator_dev' NOSUPERUSER CREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;

  -- Application role (DATABASE_URL): not an owner, no BYPASSRLS (DEC-009, US-025).
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'torre_app') THEN
    CREATE ROLE torre_app LOGIN PASSWORD 'torre_app_dev' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;

  -- Maintenance role of the `maintenance` queue (DATABASE_MAINTENANCE_URL, DEC-078, US-117):
  -- BYPASSRLS, but no table privilege by default; each table it purges grants them in its migration.
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'torre_maintenance') THEN
    CREATE ROLE torre_maintenance LOGIN PASSWORD 'torre_maintenance_dev' NOSUPERUSER NOCREATEDB NOCREATEROLE BYPASSRLS;
  END IF;
END
$$;
