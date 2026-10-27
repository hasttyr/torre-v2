-- Development cluster bootstrap (US-003:AC2): the roles, shared by every database of the cluster.
-- Runs once, as the superuser. Passwords are development-only values; never reuse them outside a
-- local machine. 02-database.sql prepares each database (US-007 runs it for every test database).

-- Migration role: owns the schema and runs Prisma migrations (DATABASE_MIGRATION_URL).
-- CREATEDB lets `prisma migrate dev` create its shadow database.
CREATE ROLE torre_migrator LOGIN PASSWORD 'torre_migrator_dev' NOSUPERUSER CREATEDB NOCREATEROLE NOBYPASSRLS;

-- Application role (DATABASE_URL): not an owner, no BYPASSRLS (DEC-009, US-025).
CREATE ROLE torre_app LOGIN PASSWORD 'torre_app_dev' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
