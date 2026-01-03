-- 0024_app_audit_log.sql
-- MVP: yleinen append-only audit-loki sovelluksen tapahtumille

CREATE TABLE IF NOT EXISTS app_audit_log (
  audit_event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  event_time timestamptz NOT NULL DEFAULT now(),
  actor text NOT NULL,
  action text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

DO $$ BEGIN
  CREATE TRIGGER app_audit_log_append_only
    BEFORE UPDATE OR DELETE ON app_audit_log
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS app_audit_log_project_time_idx
  ON app_audit_log(project_id, event_time DESC);
