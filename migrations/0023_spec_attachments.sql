-- 0023_spec_attachments.sql
-- Spec-alignment: liitteet append-only tauluun
-- Lahe: spec/data-model/03_postgres_tables.md

DO $$ BEGIN
  CREATE TYPE attachment_owner_type AS ENUM ('PLAN','FORECAST_EVENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS attachments (
  attachment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type attachment_owner_type NOT NULL,
  owner_id uuid NOT NULL,
  filename text NOT NULL,
  storage_ref text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text
);

CREATE INDEX IF NOT EXISTS attachments_owner_idx
  ON attachments(owner_type, owner_id);

DO $$ BEGIN
  CREATE TRIGGER attachments_append_only
    BEFORE UPDATE OR DELETE ON attachments
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
