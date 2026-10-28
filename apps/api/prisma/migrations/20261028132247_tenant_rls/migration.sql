-- US-025a: Row-Level Security on the tables with organization_id (DEC-009, ARCHITECTURE.md §8.3,
-- INV-T-1, DEC-107; audit_log follows in US-025c). The database itself keeps tenants apart: without a tenant or an account in the
-- transaction (withTransaction sets both with set_config(…, true)), a query sees no rows. FORCE applies
-- the policies to the owner too; only a superuser or a role with BYPASSRLS skips them, and the
-- application role has neither (infra/postgres/init).

-- The context of the transaction; '' (never set, or reset after a transaction) reads as NULL.
CREATE FUNCTION "app_current_organization"() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.organization_id', true), '')::uuid
$$;

CREATE FUNCTION "app_current_user"() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.user_id', true), '')::uuid
$$;

-- organizations is the registry of tenants, not a table of one (it has no organization_id, like
-- institutions): the authorization layer guards it (organization.view, US-024) and its name and slug are
-- public in the tournaments' addresses (DEC-107).

-- memberships: those of the tenant, and an account's own in every organization (GET /me/memberships,
-- the permissions of each request). A PLATFORM membership (no organization) is never written by the
-- application: platform_admin is not granted through the API (BR-ROLE-01).
ALTER TABLE "memberships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "memberships" FORCE ROW LEVEL SECURITY;
CREATE POLICY "memberships_tenant" ON "memberships"
  USING ("organization_id" = "app_current_organization"())
  WITH CHECK ("organization_id" = "app_current_organization"());
CREATE POLICY "memberships_own" ON "memberships" FOR SELECT
  USING ("user_id" = "app_current_user"());

-- roles: the system roles for everyone, an organization's own roles in it, and the roles an account
-- holds (US-108).
ALTER TABLE "roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "roles" FORCE ROW LEVEL SECURITY;
CREATE POLICY "roles_system" ON "roles" FOR SELECT
  USING ("organization_id" IS NULL);
CREATE POLICY "roles_tenant" ON "roles"
  USING ("organization_id" = "app_current_organization"())
  WITH CHECK ("organization_id" = "app_current_organization"());
CREATE POLICY "roles_held" ON "roles" FOR SELECT
  USING (EXISTS (SELECT 1 FROM "memberships" m WHERE m."role_id" = "roles"."id" AND m."user_id" = "app_current_user"()));

-- audit_log gets its policies with US-025c (its other rule, append only, is already in force).
