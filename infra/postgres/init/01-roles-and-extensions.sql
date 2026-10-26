-- Development database bootstrap (US-003:AC2). Runs once, as the superuser, connected to `torre`.
-- Passwords are development-only values; never reuse them outside a local machine.

-- Migration role: owns the schema and runs Prisma migrations (DATABASE_MIGRATION_URL).
-- CREATEDB lets `prisma migrate dev` create its shadow database.
CREATE ROLE torre_migrator LOGIN PASSWORD 'torre_migrator_dev' NOSUPERUSER CREATEDB NOCREATEROLE NOBYPASSRLS;

-- Application role (DATABASE_URL): not an owner, no BYPASSRLS (DEC-009, US-025).
CREATE ROLE torre_app LOGIN PASSWORD 'torre_app_dev' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;

ALTER DATABASE torre OWNER TO torre_migrator;
ALTER SCHEMA public OWNER TO torre_migrator;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

-- Text search helpers used by player search and duplicate detection (US-031, US-072).
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

GRANT CONNECT ON DATABASE torre TO torre_app;
GRANT USAGE ON SCHEMA public TO torre_app;

-- Tables created later by the migration role are readable and writable by the app,
-- but never deletable: deletion is logical (DEC-059, ARCHITECTURE.md §8.4).
ALTER DEFAULT PRIVILEGES FOR ROLE torre_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE ON TABLES TO torre_app;
ALTER DEFAULT PRIVILEGES FOR ROLE torre_migrator IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO torre_app;
