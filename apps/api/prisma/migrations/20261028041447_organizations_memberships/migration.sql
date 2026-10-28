-- US-023: organizations (tenants), the system roles and memberships: a role of a user in a scope
-- (AUTHORIZATION.md §2–§3, ARCHITECTURE.md §8.1). Permissions arrive with US-024, RLS with US-025.

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo_key" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),
    "deleted_by" UUID,
    "delete_reason" TEXT,
    "deletion_batch_id" UUID,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scope_type" TEXT NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),
    "deleted_by" UUID,
    "delete_reason" TEXT,
    "deletion_batch_id" UUID,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "user_id" UUID NOT NULL,
    "scope_type" TEXT NOT NULL,
    "scope_id" UUID,
    "role_id" UUID NOT NULL,
    "source" TEXT NOT NULL,
    "granted_by" UUID,
    "grant_reason" TEXT,
    "role_request_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(6),
    "revoked_by" UUID,
    "revoke_reason" TEXT,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_id_scope_type_key" ON "roles"("id", "scope_type");

-- CreateIndex
CREATE INDEX "memberships_user_id_revoked_at_idx" ON "memberships"("user_id", "revoked_at");

-- CreateIndex
CREATE INDEX "memberships_scope_type_scope_id_idx" ON "memberships"("scope_type", "scope_id");

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_role_id_scope_type_fkey" FOREIGN KEY ("role_id", "scope_type") REFERENCES "roles"("id", "scope_type") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_revoked_by_fkey" FOREIGN KEY ("revoked_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Values the API reads from @torre/contracts (US-023:AC3); the database refuses anything else.
ALTER TABLE "roles" ADD CONSTRAINT "roles_scope_type_check"
  CHECK ("scope_type" IN ('PLATFORM', 'ORGANIZATION', 'TOURNAMENT', 'TEAM'));
ALTER TABLE "roles" ADD CONSTRAINT "roles_key_format" CHECK ("key" ~ '^[a-z][a-z0-9_]*$');
-- System roles belong to no organization; an organization's own roles (US-108) never act on the platform.
ALTER TABLE "roles" ADD CONSTRAINT "roles_system_has_no_organization"
  CHECK ("is_system" = ("organization_id" IS NULL));
ALTER TABLE "roles" ADD CONSTRAINT "roles_platform_scope_is_system"
  CHECK ("scope_type" <> 'PLATFORM' OR "is_system");
CREATE UNIQUE INDEX "roles_organization_id_key_live_key" ON "roles" ("organization_id", "key")
  NULLS NOT DISTINCT WHERE "deleted_at" IS NULL;

ALTER TABLE "organizations" ADD CONSTRAINT "organizations_name_length"
  CHECK (char_length(btrim("name")) BETWEEN 1 AND 120);
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_slug_format"
  CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length("slug") BETWEEN 3 AND 63);
CREATE UNIQUE INDEX "organizations_slug_live_key" ON "organizations" ("slug") WHERE "deleted_at" IS NULL;

ALTER TABLE "memberships" ADD CONSTRAINT "memberships_scope_type_check"
  CHECK ("scope_type" IN ('PLATFORM', 'ORGANIZATION', 'TOURNAMENT', 'TEAM'));
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_source_check"
  CHECK ("source" IN ('BOOTSTRAP', 'CREATOR', 'DIRECT', 'REQUEST'));
-- Only the PLATFORM scope lives outside an organization; an ORGANIZATION scope is the organization itself.
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_platform_has_no_organization"
  CHECK (("scope_type" = 'PLATFORM') = ("organization_id" IS NULL));
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_platform_has_no_scope_id"
  CHECK (("scope_type" = 'PLATFORM') = ("scope_id" IS NULL));
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_scope_is_the_organization"
  CHECK ("scope_type" <> 'ORGANIZATION' OR "scope_id" = "organization_id");
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_revocation_details"
  CHECK ("revoked_at" IS NOT NULL OR ("revoked_by" IS NULL AND "revoke_reason" IS NULL));
-- One live membership per user, role and scope; a revoked one can be granted again (US-023:AC1).
CREATE UNIQUE INDEX "memberships_live_grant_key" ON "memberships" ("user_id", "role_id", "scope_type", "scope_id")
  NULLS NOT DISTINCT WHERE "revoked_at" IS NULL;
CREATE INDEX "memberships_organization_id_live_idx" ON "memberships" ("organization_id") WHERE "revoked_at" IS NULL;

-- The seven system roles of AUTHORIZATION.md §3 with the scope of ROLE_SCOPES (@torre/contracts). US-024
-- gives them the permissions of the matrix (§4); viewer is not a role but the lack of memberships.
INSERT INTO "roles" ("id", "key", "name", "scope_type", "is_system") VALUES
  (uuidv7(), 'platform_admin', 'Administrador de la plataforma', 'PLATFORM', true),
  (uuidv7(), 'org_owner', 'Dueño de la organización', 'ORGANIZATION', true),
  (uuidv7(), 'org_admin', 'Administrador de la organización', 'ORGANIZATION', true),
  (uuidv7(), 'tournament_director', 'Director del torneo', 'TOURNAMENT', true),
  (uuidv7(), 'arbiter', 'Árbitro', 'TOURNAMENT', true),
  (uuidv7(), 'captain', 'Capitán', 'TEAM', true),
  (uuidv7(), 'player', 'Jugador', 'TOURNAMENT', true);

-- An organization always keeps a live org_owner (US-023:AC5, AUTHORIZATION.md §3). Both triggers are
-- deferred to the commit, so a transaction may hand ownership over in any order (grant, then revoke).
-- The count is plpgsql (volatile): under READ COMMITTED each statement takes a new snapshot, so after
-- the lock it sees what other transactions committed meanwhile.
CREATE FUNCTION "organization_keeps_an_owner"(org uuid) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  -- Serialise the commits that touch the owners of one organization: two transactions that each revoke
  -- a different owner cannot both see the other one still there. A logically deleted organization
  -- (US-109) owes no owner.
  PERFORM 1 FROM "organizations" WHERE "id" = org AND "deleted_at" IS NULL FOR UPDATE;
  IF NOT FOUND THEN
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM "memberships" m JOIN "roles" r ON r."id" = m."role_id"
    WHERE m."organization_id" = org AND m."scope_type" = 'ORGANIZATION' AND m."revoked_at" IS NULL
      AND r."organization_id" IS NULL AND r."key" = 'org_owner'
  ) THEN
    RAISE EXCEPTION 'organization % would be left without an org_owner (US-023:AC5)', org
      USING ERRCODE = 'check_violation', CONSTRAINT = 'organizations_keep_an_org_owner';
  END IF;
END
$$;

-- A membership that was a live org_owner was revoked, changed or removed.
CREATE FUNCTION "memberships_keep_an_org_owner"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."revoked_at" IS NULL AND OLD."scope_type" = 'ORGANIZATION' AND EXISTS (
    SELECT 1 FROM "roles" WHERE "id" = OLD."role_id" AND "organization_id" IS NULL AND "key" = 'org_owner'
  ) THEN
    PERFORM "organization_keeps_an_owner"(OLD."organization_id");
  END IF;
  RETURN NULL;
END
$$;

CREATE CONSTRAINT TRIGGER "memberships_keep_an_org_owner"
  AFTER UPDATE OR DELETE ON "memberships"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION "memberships_keep_an_org_owner"();

-- An organization is born (or restored) with its owner in the same transaction.
CREATE FUNCTION "organizations_need_an_org_owner"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM "organization_keeps_an_owner"(NEW."id");
  RETURN NULL;
END
$$;

CREATE CONSTRAINT TRIGGER "organizations_need_an_org_owner"
  AFTER INSERT OR UPDATE OF "deleted_at" ON "organizations"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION "organizations_need_an_org_owner"();
