-- US-022b: the audit trail of actions outside the tournament streams (ARCHITECTURE.md §8.1), starting
-- with the security events of authentication (BR-AUTH-07). Insert only (DEC-077, INV-E-7).

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "actor_user_id" UUID,
    "action" TEXT NOT NULL,
    "target_type" TEXT,
    "target_id" UUID,
    "reason" TEXT,
    "changes" JSONB,
    "ip_hash" TEXT,
    "correlation_id" TEXT,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_log_actor_user_id_occurred_at_idx" ON "audit_log"("actor_user_id", "occurred_at");

-- CreateIndex
CREATE INDEX "audit_log_target_type_target_id_idx" ON "audit_log"("target_type", "target_id");

-- The default privileges of infra/postgres/init give the application SELECT, INSERT and UPDATE on new
-- tables; the audit trail keeps only the first two.
REVOKE UPDATE ON TABLE "audit_log" FROM torre_app;

-- Nobody rewrites the past, not even the owner: rows are never updated or deleted, the table never
-- truncated (DEC-077). Disabling the trigger would itself need a migration, which is reviewed.
CREATE FUNCTION "audit_log_is_append_only"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only (DEC-077): % refused', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END
$$;

CREATE TRIGGER "audit_log_no_update_or_delete"
  BEFORE UPDATE OR DELETE ON "audit_log"
  FOR EACH ROW EXECUTE FUNCTION "audit_log_is_append_only"();

CREATE TRIGGER "audit_log_no_truncate"
  BEFORE TRUNCATE ON "audit_log"
  FOR EACH STATEMENT EXECUTE FUNCTION "audit_log_is_append_only"();

-- The session list shows the IP only as a keyed hash (THREAT-MODEL.md §5); same for the trail.
COMMENT ON COLUMN "audit_log"."ip_hash" IS 'HMAC-SHA-256 of the client address with IP_HASH_SECRET (DEC-096)';
COMMENT ON COLUMN "auth_sessions"."ip_hash" IS 'HMAC-SHA-256 of the client address with IP_HASH_SECRET (DEC-096)';
