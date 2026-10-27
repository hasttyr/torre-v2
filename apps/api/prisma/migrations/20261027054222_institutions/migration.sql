-- US-007: first migration. Institutions are the global catalogue of universities (ARCHITECTURE.md §8.1);
-- the application role reads and writes them but cannot delete them (DEC-059, infra/postgres/init).

-- CreateTable
CREATE TABLE "institutions" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "snies_code" TEXT,
    "city" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),
    "deleted_by" UUID,
    "delete_reason" TEXT,
    "deletion_batch_id" UUID,

    CONSTRAINT "institutions_pkey" PRIMARY KEY ("id")
);

-- Only the migration role touches the migration history: the default privileges of the init script
-- would otherwise let the application role rewrite it (US-007:AC2).
DO $$
DECLARE
  grantee_name text;
BEGIN
  FOR grantee_name IN
    SELECT DISTINCT grantee FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND table_name = '_prisma_migrations' AND grantee <> current_user
  LOOP
    EXECUTE format('REVOKE ALL ON TABLE public._prisma_migrations FROM %I', grantee_name);
  END LOOP;
END
$$;
