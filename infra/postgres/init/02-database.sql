-- Database bootstrap (US-003:AC2, US-007): runs as the superuser, connected to the database it
-- prepares (`torre` locally, a fresh one per test suite). Needs the roles of 01-roles.sql.

DO $$
BEGIN
  EXECUTE format('ALTER DATABASE %I OWNER TO torre_migrator', current_database());
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO torre_app', current_database());
END
$$;
ALTER SCHEMA public OWNER TO torre_migrator;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

-- Text search helpers used by player search and duplicate detection (US-031, US-072).
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

GRANT USAGE ON SCHEMA public TO torre_app;

-- Tables created later by the migration role are readable and writable by the app,
-- but never deletable: deletion is logical (DEC-059, ARCHITECTURE.md §8.4).
ALTER DEFAULT PRIVILEGES FOR ROLE torre_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE ON TABLES TO torre_app;
ALTER DEFAULT PRIVILEGES FOR ROLE torre_migrator IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO torre_app;
