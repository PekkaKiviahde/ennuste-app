-- 0048_change_requests_mt_lt.sql
-- MT/LT (tilaajan muutostyöt ja lisätyöt): otsikko + status-eventit + kohdistusrivit + raporttinäkymät (vain APPROVED).
--
-- Mitä muuttui:
-- - Lisätty enumit `change_type` (MT/LT) ja `change_status` (DRAFT/SUBMITTED/APPROVED/CANCELLED).
-- - Lisätty taulut: `project_change_counters`, `change_requests`, `change_request_events`, `change_request_lines`.
-- - Lisätty näkymät: `v_change_request_current_status`, `v_report_change_requests_approved`, `v_report_project_mt_lt_approved`.
-- - Lisätty funktiot: `change_request_create(...)`, `change_request_set_status(...)`.
-- Miksi:
-- - MT/LT on tilaajalähtöinen muutosvirta, jossa numerointi on järjestelmän generoima per projekti ja vaikutus raportointiin alkaa vasta APPROVED-tilassa.
-- Miten testataan (manuaali):
-- - Aja migraatiot puhtaaseen kantaan.
-- - Aja `docs/sql/VERIFY_INVARIANTS.sql` ja `docs/sql/SMOKE_E2E_CORE.sql`.
-- - Aja tiedoston lopun smoke-test blokki (kommenttina).

BEGIN;

-- =========================
-- ENUMit (idempotentti)
-- =========================
DO $$ BEGIN
  CREATE TYPE change_type AS ENUM ('MT','LT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE change_status AS ENUM ('DRAFT','SUBMITTED','APPROVED','CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================
-- Laskurit (mutable)
-- =========================
CREATE TABLE IF NOT EXISTS project_change_counters (
  project_id uuid PRIMARY KEY REFERENCES projects(project_id) ON DELETE CASCADE,
  next_mt_no int NOT NULL DEFAULT 1,
  next_lt_no int NOT NULL DEFAULT 1
);

-- =========================
-- Otsikko (append-only)
-- =========================
CREATE TABLE IF NOT EXISTS change_requests (
  change_request_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  change_type change_type NOT NULL,
  change_seq int NOT NULL,
  change_code text NOT NULL,
  title text NOT NULL,
  schedule_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL,
  UNIQUE (project_id, change_type, change_seq),
  UNIQUE (project_id, change_code),
  UNIQUE (change_request_id, project_id),
  CONSTRAINT change_requests_change_code_chk CHECK (change_code ~ '^(MT|LT)-[0-9]{3,}$')
);

DO $$ BEGIN
  CREATE TRIGGER change_requests_append_only
    BEFORE UPDATE OR DELETE ON change_requests
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================
-- Status-eventit (append-only)
-- =========================
CREATE TABLE IF NOT EXISTS change_request_events (
  change_request_event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  change_request_id uuid NOT NULL REFERENCES change_requests(change_request_id) ON DELETE CASCADE,
  status change_status NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL,
  note text
);

CREATE INDEX IF NOT EXISTS ix_change_request_events_request_time
  ON change_request_events(change_request_id, created_at DESC, change_request_event_id DESC);

DO $$ BEGIN
  CREATE TRIGGER change_request_events_append_only
    BEFORE UPDATE OR DELETE ON change_request_events
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================
-- Kohdistusrivit (append-only)
-- =========================
CREATE TABLE IF NOT EXISTS change_request_lines (
  change_request_line_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  change_request_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  littera_code text NOT NULL,
  work_package_id uuid REFERENCES work_packages(id) ON DELETE RESTRICT,
  proc_package_id uuid REFERENCES proc_packages(id) ON DELETE RESTRICT,
  cost_type cost_type,
  cost_eur numeric(14,2) NOT NULL,
  revenue_eur numeric(14,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL,
  note text,
  CONSTRAINT change_request_lines_littera_code_chk CHECK (littera_code ~ '^[0-9]{4}$'),
  CONSTRAINT change_request_lines_one_package_chk CHECK (num_nonnulls(work_package_id, proc_package_id) = 1),
  CONSTRAINT change_request_lines_header_project_fkey
    FOREIGN KEY (change_request_id, project_id)
    REFERENCES change_requests(change_request_id, project_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_change_request_lines_request
  ON change_request_lines(change_request_id, created_at DESC, change_request_line_id DESC);

CREATE INDEX IF NOT EXISTS ix_change_request_lines_work_package
  ON change_request_lines(work_package_id, created_at DESC, change_request_line_id DESC);

CREATE INDEX IF NOT EXISTS ix_change_request_lines_proc_package
  ON change_request_lines(proc_package_id, created_at DESC, change_request_line_id DESC);

DO $$ BEGIN
  CREATE TRIGGER change_request_lines_append_only
    BEFORE UPDATE OR DELETE ON change_request_lines
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================
-- Näkymät
-- =========================
CREATE OR REPLACE VIEW v_change_request_current_status AS
SELECT DISTINCT ON (e.change_request_id)
  e.change_request_id,
  e.status,
  e.created_at AS status_at,
  e.created_by AS status_by,
  e.change_request_event_id
FROM change_request_events e
ORDER BY e.change_request_id, e.created_at DESC, e.change_request_event_id DESC;

CREATE OR REPLACE VIEW v_report_change_requests_approved AS
SELECT
  r.project_id,
  r.change_type,
  r.change_request_id,
  r.change_code,
  r.title,
  r.schedule_note,
  SUM(l.cost_eur) AS cost_total,
  SUM(l.revenue_eur) AS revenue_total,
  (SUM(l.revenue_eur) - SUM(l.cost_eur)) AS margin_total
FROM change_requests r
JOIN v_change_request_current_status s
  ON s.change_request_id = r.change_request_id
 AND s.status = 'APPROVED'
JOIN change_request_lines l
  ON l.change_request_id = r.change_request_id
GROUP BY
  r.project_id,
  r.change_type,
  r.change_request_id,
  r.change_code,
  r.title,
  r.schedule_note;

CREATE OR REPLACE VIEW v_report_project_mt_lt_approved AS
SELECT
  a.project_id,
  a.change_type,
  COUNT(DISTINCT a.change_request_id) AS approved_count,
  SUM(a.cost_total) AS approved_cost_total,
  SUM(a.revenue_total) AS approved_revenue_total,
  SUM(a.margin_total) AS approved_margin_total
FROM v_report_change_requests_approved a
GROUP BY a.project_id, a.change_type;

-- =========================
-- Funktiot
-- =========================
CREATE OR REPLACE FUNCTION change_request_create(
  p_project_id uuid,
  p_change_type change_type,
  p_title text,
  p_schedule_note text,
  p_created_by text,
  p_description text DEFAULT NULL
)
RETURNS TABLE (change_request_id uuid, change_code text)
LANGUAGE plpgsql
AS $$
DECLARE
  v_seq int;
  v_change_request_id uuid;
  v_change_code text;
BEGIN
  INSERT INTO project_change_counters (project_id)
  VALUES (p_project_id)
  ON CONFLICT (project_id) DO NOTHING;

  -- Lukitse laskuririvi (per projekti).
  PERFORM 1
  FROM project_change_counters
  WHERE project_id = p_project_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'project_change_counters rivi puuttuu: project_id=%', p_project_id;
  END IF;

  IF p_change_type = 'MT' THEN
    UPDATE project_change_counters
    SET next_mt_no = next_mt_no + 1
    WHERE project_id = p_project_id
    RETURNING next_mt_no - 1 INTO v_seq;
  ELSIF p_change_type = 'LT' THEN
    UPDATE project_change_counters
    SET next_lt_no = next_lt_no + 1
    WHERE project_id = p_project_id
    RETURNING next_lt_no - 1 INTO v_seq;
  ELSE
    RAISE EXCEPTION 'Tuntematon change_type: %', p_change_type;
  END IF;

  v_change_code := p_change_type::text || '-' || lpad(v_seq::text, 3, '0');

  INSERT INTO change_requests (
    project_id,
    change_type,
    change_seq,
    change_code,
    title,
    schedule_note,
    created_by
  )
  VALUES (
    p_project_id,
    p_change_type,
    v_seq,
    v_change_code,
    p_title,
    p_schedule_note,
    p_created_by
  )
  RETURNING change_requests.change_request_id INTO v_change_request_id;

  INSERT INTO change_request_events (change_request_id, status, created_by, note)
  VALUES (v_change_request_id, 'DRAFT', p_created_by, p_description);

  change_request_id := v_change_request_id;
  change_code := v_change_code;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION change_request_set_status(
  p_change_request_id uuid,
  p_new_status change_status,
  p_created_by text,
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_status change_status;
BEGIN
  SELECT s.status INTO v_current_status
  FROM v_change_request_current_status s
  WHERE s.change_request_id = p_change_request_id;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Muutos ei loydy tai status puuttuu: change_request_id=%', p_change_request_id;
  END IF;

  IF v_current_status = 'CANCELLED' THEN
    RAISE EXCEPTION 'Status-siirto estetty: muutos on CANCELLED. change_request_id=%', p_change_request_id;
  END IF;

  IF v_current_status = 'DRAFT' AND (p_new_status = 'SUBMITTED' OR p_new_status = 'CANCELLED') THEN
    -- ok
  ELSIF v_current_status = 'SUBMITTED' AND (p_new_status = 'APPROVED' OR p_new_status = 'CANCELLED') THEN
    -- ok
  ELSIF v_current_status = 'APPROVED' AND p_new_status = 'CANCELLED' THEN
    -- ok
  ELSE
    RAISE EXCEPTION 'Epa-sallittu status-siirto: % -> % (change_request_id=%)', v_current_status, p_new_status, p_change_request_id;
  END IF;

  INSERT INTO change_request_events (change_request_id, status, created_by, note)
  VALUES (p_change_request_id, p_new_status, p_created_by, p_note);
END;
$$;

COMMIT;

-- =========================
-- Smoke-test (aja kasin psql:lla; ESIMERKKI)
-- =========================
-- Huom:
-- - Valitse olemassa oleva project_id sekä work_package_id ja proc_package_id kyseisestä projektista.
-- - `littera_code` on aina 4-numeroisena merkkijonona (leading zero säilyy).
--
-- \set project_id '00000000-0000-0000-0000-000000000000'
-- \set work_package_id '00000000-0000-0000-0000-000000000000'
-- \set proc_package_id '00000000-0000-0000-0000-000000000000'
--
-- -- Luo MT ja LT samalle projektille
-- SELECT * FROM change_request_create(:'project_id', 'MT', 'MT test', 'Aikataulu +2 pv', 'manual', 'kuvaus');
-- SELECT * FROM change_request_create(:'project_id', 'LT', 'LT test', NULL, 'manual', NULL);
--
-- -- Ota MT:n id talteen (viimeisin MT)
-- SELECT change_request_id, change_code
-- FROM change_requests
-- WHERE project_id=:'project_id' AND change_type='MT'
-- ORDER BY created_at DESC, change_request_id DESC
-- LIMIT 1;
--
-- \set mt_id '...'
--
-- -- Lisää MT:hen 2 riviä: yksi työpakettiin, yksi hankintapakettiin
-- INSERT INTO change_request_lines (
--   change_request_id, project_id, littera_code, work_package_id, cost_type, cost_eur, revenue_eur, created_by, note
-- ) VALUES (
--   :'mt_id', :'project_id', '0310', :'work_package_id', 'LABOR', 100.00, 150.00, 'manual', 'tyopaketti-rivi'
-- );
--
-- INSERT INTO change_request_lines (
--   change_request_id, project_id, littera_code, proc_package_id, cost_type, cost_eur, revenue_eur, created_by, note
-- ) VALUES (
--   :'mt_id', :'project_id', '4100', :'proc_package_id', 'MATERIAL', 200.00, 260.00, 'manual', 'hankintapaketti-rivi'
-- );
--
-- -- Statuspolku: DRAFT -> SUBMITTED -> APPROVED
-- SELECT change_request_set_status(:'mt_id', 'SUBMITTED', 'manual', 'lahetetty');
-- SELECT change_request_set_status(:'mt_id', 'APPROVED', 'manual', 'hyvaksytty');
--
-- -- Drilldown ja projektikoonti (vain APPROVED)
-- SELECT * FROM v_report_change_requests_approved WHERE project_id=:'project_id';
-- SELECT * FROM v_report_project_mt_lt_approved WHERE project_id=:'project_id';
--
-- -- Varmista, ettei CANCELLED vaikuta (muutos ei enaa nay approved-nakymissa)
-- SELECT change_request_set_status(:'mt_id', 'CANCELLED', 'manual', 'peruttu');
-- SELECT * FROM v_report_change_requests_approved WHERE project_id=:'project_id';
-- SELECT * FROM v_report_project_mt_lt_approved WHERE project_id=:'project_id';
