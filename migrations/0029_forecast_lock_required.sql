-- 0029_forecast_lock_required.sql
-- Ennusteen luonti vaatii LOCKED-lukituksen (target-kohtainen gate)

BEGIN;

CREATE OR REPLACE FUNCTION enforce_plan_before_forecast()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_status plan_status;
BEGIN
  SELECT pe.status INTO v_status
  FROM planning_events pe
  WHERE pe.project_id = NEW.project_id
    AND pe.target_littera_id = NEW.target_littera_id
  ORDER BY pe.event_time DESC
  LIMIT 1;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Cannot create forecast: no planning exists for target littera.';
  END IF;

  IF v_status <> 'LOCKED' THEN
    RAISE EXCEPTION 'Cannot create forecast: latest planning status is % (must be LOCKED).', v_status;
  END IF;

  RETURN NEW;
END;
$$;

COMMIT;
