-- 0036_forecast_events_add_target_littera_id.sql
-- Korjaa VERIFY_INVARIANTS: lisää forecast_events.target_littera_id ja yrittää FK:n litteras-tauluun.

ALTER TABLE forecast_events
ADD COLUMN IF NOT EXISTS target_littera_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'forecast_events'
      AND c.conname = 'forecast_events_target_littera_fk'
  ) THEN
    ALTER TABLE forecast_events
      ADD CONSTRAINT forecast_events_target_littera_fk
      FOREIGN KEY (target_littera_id)
      REFERENCES litteras(littera_id)
      ON DELETE RESTRICT;
  END IF;
EXCEPTION WHEN undefined_table THEN
  RAISE EXCEPTION 'forecast_events or litteras missing';
WHEN others THEN
  RAISE NOTICE 'FK not added: %', SQLERRM;
END $$;
