-- US-045a: the event store (ARCHITECTURE.md §7.2, §8.1, DEC-008): the source of truth of every tournament.
-- Insert only (BR-AUD-01, INV-E-4); sequences without gaps per stream (INV-E-1); tenant isolation (US-025).

-- CreateTable
CREATE TABLE "events" (
    "global_position" BIGSERIAL NOT NULL,
    "event_id" UUID NOT NULL DEFAULT uuidv7(),
    "organization_id" UUID NOT NULL,
    "stream_type" TEXT NOT NULL,
    "stream_id" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "schema_version" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "metadata" JSONB NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "recorded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("global_position")
);

-- CreateTable
CREATE TABLE "outbox" (
    "id" BIGSERIAL NOT NULL,
    "event_id" UUID NOT NULL,
    "topic" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMPTZ(6),

    CONSTRAINT "outbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "events_event_id_key" ON "events"("event_id");

-- CreateIndex
CREATE INDEX "events_organization_id_recorded_at_idx" ON "events"("organization_id", "recorded_at");

-- CreateIndex
CREATE UNIQUE INDEX "events_stream_id_sequence_key" ON "events"("stream_id", "sequence");

ALTER TABLE "events" ADD CONSTRAINT "events_stream_type_check" CHECK ("stream_type" IN ('tournament'));
ALTER TABLE "events" ADD CONSTRAINT "events_sequence_positive" CHECK ("sequence" >= 1);
ALTER TABLE "events" ADD CONSTRAINT "events_schema_version_positive" CHECK ("schema_version" >= 1);
ALTER TABLE "events" ADD CONSTRAINT "events_type_format" CHECK ("type" ~ '^[A-Z][A-Za-z]+$');

-- The application appends and reads; it never rewrites (the default privileges of infra/postgres/init give
-- it UPDATE on new tables).
REVOKE UPDATE ON TABLE "events" FROM torre_app;

-- Nobody rewrites the past, not even the owner: corrections are new events (BR-AUD-01, INV-E-4).
CREATE FUNCTION "events_are_append_only"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'events are append-only (INV-E-4): % refused', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END
$$;

CREATE TRIGGER "events_no_update_or_delete"
  BEFORE UPDATE OR DELETE ON "events"
  FOR EACH ROW EXECUTE FUNCTION "events_are_append_only"();

CREATE TRIGGER "events_no_truncate"
  BEFORE TRUNCATE ON "events"
  FOR EACH STATEMENT EXECUTE FUNCTION "events_are_append_only"();

-- A tenant appends and reads only its own streams (US-025, INV-T-1).
ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "events" FORCE ROW LEVEL SECURITY;
CREATE POLICY "events_tenant" ON "events"
  USING ("organization_id" = "app_current_organization"())
  WITH CHECK ("organization_id" = "app_current_organization"());

-- The publisher (US-051) only looks at what is still pending.
CREATE INDEX "outbox_pending_idx" ON "outbox" ("id") WHERE "published_at" IS NULL;
