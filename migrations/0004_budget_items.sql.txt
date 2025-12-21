-- 0004_budget_items.sql
-- Detailed target estimate items (nimiketaso)
-- Tämä vastaa tavoitearvio-Excelin rivejä (A–Q)
-- Luotu: 2025-12-18

CREATE TABLE IF NOT EXISTS budget_items (
  budget_item_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  import_batch_id uuid NOT NULL REFERENCES import_batches(import_batch_id) ON DELETE RESTRICT,

  littera_id uuid NOT NULL,
  item_code text NOT NULL,        -- Excel C: Koodi (esim. 56001013)
  item_desc text,                 -- Excel D: Selite
  row_no integer NOT NULL,        -- Excel-rivin numero (audit)

  qty numeric(18,4),              -- Excel E: Määrä
  unit text,                      -- Excel F: Yksikkö

  labor_unit_price numeric(14,2),       -- Excel H: Työ €/yks.
  material_unit_price numeric(14,2),    -- Excel J: Aine €/yks.
  subcontract_unit_price numeric(14,2), -- Excel L: Alih €/yks.
  rental_unit_price numeric(14,2),      -- Excel N: Vmiehet €/yks.

  labor_eur numeric(14,2),         -- Excel I: Työ €
  material_eur numeric(14,2),      -- Excel K: Aine €
  subcontract_eur numeric(14,2),   -- Excel M: Alih €
  rental_eur numeric(14,2),        -- Excel O: Vmiehet €
  other_eur numeric(14,2),         -- Excel P: Muu €
  total_eur numeric(14,2),         -- Excel Q: Summa

  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL,

  CONSTRAINT budget_items_littera_fk
    FOREIGN KEY (project_id, littera_id)
    REFERENCES litteras(project_id, littera_id)
    ON DELETE RESTRICT,

  CONSTRAINT budget_items_unique_row
    UNIQUE (import_batch_id, row_no)
);

CREATE INDEX IF NOT EXISTS budget_items_lookup_idx
  ON budget_items(project_id, littera_id);

CREATE INDEX IF NOT EXISTS budget_items_itemcode_idx
  ON budget_items(project_id, item_code);

-- Append-only: estetään UPDATE ja DELETE
DO $$ BEGIN
  CREATE TRIGGER budget_items_append_only
    BEFORE UPDATE OR DELETE ON budget_items
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
