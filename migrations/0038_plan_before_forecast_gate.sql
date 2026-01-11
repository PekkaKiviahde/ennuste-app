-- 0038_plan_before_forecast_gate.sql
-- Gate: estä ennusteen luonti ennen suunnittelua/mäppäyksen aktivointia.
--
-- VERIFY_INVARIANTS odottaa, että forecast_events insert ilman ACTIVE item-mäppäysversiota kaatuu
-- virheellä "Cannot create forecast: ...".

CREATE OR REPLACE FUNCTION require_plan_before_forecast()
RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM item_mapping_versions imv
    WHERE imv.project_id = NEW.project_id
      AND imv.status = 'ACTIVE'
  ) THEN
    RAISE EXCEPTION 'Cannot create forecast: missing ACTIVE item mapping version for project_id=%', NEW.project_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER forecast_events_require_plan_before_forecast
    BEFORE INSERT ON forecast_events
    FOR EACH ROW EXECUTE FUNCTION require_plan_before_forecast();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
