-- 0037_forecast_events_add_source.sql
-- Minimi: lisää forecast_events.source VERIFY_INVARIANTS:n plan-before-forecast -testiä varten.

ALTER TABLE forecast_events
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'UNKNOWN';
