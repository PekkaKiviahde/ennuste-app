-- 0033_append_only_missing_triggers.sql
-- Korjaa invariantit: lisää append-only triggerit puuttuviin tauluihin.
-- Edellyttää prevent_update_delete() -funktiota (baseline:ssa).

DO $$ BEGIN
  CREATE TRIGGER forecast_events_append_only
    BEFORE UPDATE OR DELETE ON forecast_events
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER forecast_event_rows_append_only
    BEFORE UPDATE OR DELETE ON forecast_event_rows
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER import_batches_append_only
    BEFORE UPDATE OR DELETE ON import_batches
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
