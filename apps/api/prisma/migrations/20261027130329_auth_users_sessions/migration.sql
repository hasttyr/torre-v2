-- US-022: accounts, sessions (one per refresh family) and rotated refresh tokens (BR-AUTH-02, DEC-062).

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'es',
    "theme" TEXT,
    "email_verified_at" TIMESTAMPTZ(6),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "two_factor_secret" TEXT,
    "two_factor_confirmed_at" TIMESTAMPTZ(6),
    "privacy_policy_version" TEXT NOT NULL,
    "privacy_accepted_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),
    "deleted_by" UUID,
    "delete_reason" TEXT,
    "deletion_batch_id" UUID,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "user_agent" TEXT,
    "ip_hash" TEXT,
    "password_confirmed_at" TIMESTAMPTZ(6),
    "two_factor_passed_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "replaced_by" UUID,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auth_sessions_user_id_revoked_at_idx" ON "auth_sessions"("user_id", "revoked_at");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_family_id_idx" ON "refresh_tokens"("family_id");

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "auth_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- One live account per email, compared lower-case; the API stores it lower-case (US-022:AC1).
ALTER TABLE "users" ADD CONSTRAINT "users_email_lower_case" CHECK ("email" = lower("email"));
CREATE UNIQUE INDEX "users_email_active_key" ON "users" ("email") WHERE "deleted_at" IS NULL;
ALTER TABLE "users" ADD CONSTRAINT "users_status_known" CHECK ("status" IN ('ACTIVE', 'SUSPENDED', 'ANONYMIZED'));
ALTER TABLE "users" ADD CONSTRAINT "users_display_name_length" CHECK (char_length("display_name") BETWEEN 1 AND 100);

-- The maintenance queue purges expired refresh tokens (DEC-078, US-117); nothing else may touch them
-- with that role. The role is created by infra/postgres/init (and by the deployment plan, US-105).
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'torre_maintenance') THEN
    GRANT SELECT, DELETE ON TABLE "refresh_tokens" TO torre_maintenance;
  END IF;
END
$$;
