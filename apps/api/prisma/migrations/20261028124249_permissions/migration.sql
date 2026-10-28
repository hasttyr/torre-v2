-- US-024a: the permission catalogue and the permissions of each role (AUTHORIZATION.md §4–§4.1,
-- DEC-058). `permissions:sync` fills both from @torre/contracts with the migration role.

-- CreateTable
CREATE TABLE "permissions" (
    "key" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reserved" BOOLEAN NOT NULL,
    "scope_types" TEXT[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" UUID NOT NULL,
    "permission_key" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_key")
);

-- CreateIndex
CREATE INDEX "role_permissions_permission_key_idx" ON "role_permissions"("permission_key");

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_key_fkey" FOREIGN KEY ("permission_key") REFERENCES "permissions"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- The catalogue belongs to the code: the application reads it and never writes it (DEC-103).
REVOKE INSERT, UPDATE ON TABLE "permissions" FROM torre_app;

ALTER TABLE "permissions" ADD CONSTRAINT "permissions_group_check" CHECK ("group" IN (
  'platform', 'deletion', 'organization', 'rules', 'players', 'tournament', 'registration', 'teams',
  'rounds', 'results', 'reports', 'claims', 'account'));
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_scope_types_check" CHECK (
  "scope_types" IS NOT NULL AND "scope_types" <@ ARRAY['PLATFORM', 'ORGANIZATION', 'TOURNAMENT', 'TEAM']);
-- A reserved permission only exists on the platform (AUTHORIZATION.md §4.1).
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_reserved_on_platform" CHECK (
  NOT "reserved" OR "scope_types" = ARRAY['PLATFORM']);

-- A role only holds permissions of its scope, and only platform_admin holds reserved ones (INV-T-6).
-- Checked here as well as in the services of US-108, so no path (API, console, SQL) gets around it.
CREATE FUNCTION "role_permissions_respect_the_catalogue"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  permission_reserved boolean;
  permission_scopes text[];
  role_key text;
  role_scope text;
  role_is_system boolean;
BEGIN
  SELECT "reserved", "scope_types" INTO permission_reserved, permission_scopes
    FROM "permissions" WHERE "key" = NEW."permission_key";
  IF NOT FOUND THEN
    RETURN NEW; -- the foreign key answers
  END IF;
  SELECT "key", "scope_type", "is_system" INTO role_key, role_scope, role_is_system
    FROM "roles" WHERE "id" = NEW."role_id";
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;
  IF permission_reserved AND NOT (role_is_system AND role_key = 'platform_admin') THEN
    RAISE EXCEPTION 'RESERVED_PERMISSION: % is reserved to platform_admin (INV-T-6)', NEW."permission_key"
      USING ERRCODE = 'check_violation', CONSTRAINT = 'role_permissions_reserved_only_platform_admin';
  END IF;
  IF NOT (role_scope = ANY (permission_scopes)) THEN
    RAISE EXCEPTION '% cannot be granted to a role of the % scope', NEW."permission_key", role_scope
      USING ERRCODE = 'check_violation', CONSTRAINT = 'role_permissions_within_scope';
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER "role_permissions_respect_the_catalogue"
  BEFORE INSERT OR UPDATE ON "role_permissions"
  FOR EACH ROW EXECUTE FUNCTION "role_permissions_respect_the_catalogue"();
