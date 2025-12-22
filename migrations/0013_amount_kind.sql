-- 0013_amount_kind.sql
-- Adds amount_kind to line tables so OTHER != TOTAL/unclassified.

DO $$ BEGIN
  CREATE TYPE amount_kind AS ENUM ('COST', 'TOTAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- budget_lines: default COST
ALTER TABLE budget_lines
  ADD COLUMN IF NOT EXISTS amount_kind amount_kind NOT NULL DEFAULT 'COST';

-- actual_cost_lines: default COST (vanhat rivit jää COST:iksi)
ALTER TABLE actual_cost_lines
  ADD COLUMN IF NOT EXISTS amount_kind amount_kind NOT NULL DEFAULT 'COST';

-- (Jos teillä on forecast_cost_lines -taulu, lisää myös sinne)
-- ALTER TABLE forecast_cost_lines
--   ADD COLUMN IF NOT EXISTS amount_kind amount_kind NOT NULL DEFAULT 'COST';
