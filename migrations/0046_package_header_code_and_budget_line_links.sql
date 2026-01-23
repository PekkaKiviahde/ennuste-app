-- 0046_package_header_code_and_budget_line_links.sql
-- Työpaketit + hankintapaketit: header_code + budjettilinjojen (tavoitearviorivi) kytkentä ilman splittiä.
--
-- Mitä muuttui:
-- - Lisätty `header_code` sarake (generated) tauluihin `work_packages` ja `proc_packages`.
-- - Lisätty taulut `work_package_members` ja `proc_package_members` (member_type='LITTERA', useita rivejä per paketti).
-- - Lisätty taulu `package_budget_line_links`: budget_line_id -> work_package_id (+ optional proc_package_id), UNIQUE(budget_line_id) estää splitin.
-- Miksi:
-- - `header_code` toimii paketin “pääkoodina” ja on aina 4-numeroinen Talo80-koodi (merkkijono; leading zero säilyy).
-- - Yksi paketti voi sisältää useita 4-numeroisia littera-rivejä (jäsenet / budjettilinjalinkit).
-- - Sama tavoitearviorivi (budget_line_id) ei saa kuulua kahteen pakettiin (split estyy).
-- Miten testataan (manuaali):
-- - Aja migraatiot.
-- - Luo kaksi litteraa (5600/4700), luo työpaketti ja lisää molemmat `work_package_members`-tauluun.
-- - Luo kaksi `budget_lines`-riviä (5600/4700) ja linkitä molemmat samaan pakettiin `package_budget_line_links`-taululla.
-- - Yritä linkittää sama `budget_line_id` toiseen pakettiin -> UNIQUE-virhe.

BEGIN;

-- =========================
-- header_code (pääkoodi)
-- =========================
ALTER TABLE work_packages
  ADD COLUMN IF NOT EXISTS header_code text GENERATED ALWAYS AS (code) STORED;

ALTER TABLE proc_packages
  ADD COLUMN IF NOT EXISTS header_code text GENERATED ALWAYS AS (code) STORED;

-- =========================
-- Jäsenet: useita littera-rivejä per paketti
-- =========================
DO $$ BEGIN
  CREATE TYPE package_member_type AS ENUM ('LITTERA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS work_package_members (
  work_package_member_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  work_package_id uuid NOT NULL REFERENCES work_packages(id) ON DELETE CASCADE,
  member_type package_member_type NOT NULL,
  littera_id uuid NOT NULL REFERENCES litteras(littera_id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL DEFAULT 'system',
  UNIQUE (work_package_id, member_type, littera_id)
);

CREATE INDEX IF NOT EXISTS ix_work_package_members_package
  ON work_package_members(work_package_id, created_at DESC, work_package_member_id DESC);

CREATE INDEX IF NOT EXISTS ix_work_package_members_project
  ON work_package_members(project_id, created_at DESC, work_package_member_id DESC);

DO $$ BEGIN
  CREATE TRIGGER work_package_members_append_only
    BEFORE UPDATE OR DELETE ON work_package_members
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS proc_package_members (
  proc_package_member_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  proc_package_id uuid NOT NULL REFERENCES proc_packages(id) ON DELETE CASCADE,
  member_type package_member_type NOT NULL,
  littera_id uuid NOT NULL REFERENCES litteras(littera_id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL DEFAULT 'system',
  UNIQUE (proc_package_id, member_type, littera_id)
);

CREATE INDEX IF NOT EXISTS ix_proc_package_members_package
  ON proc_package_members(proc_package_id, created_at DESC, proc_package_member_id DESC);

CREATE INDEX IF NOT EXISTS ix_proc_package_members_project
  ON proc_package_members(project_id, created_at DESC, proc_package_member_id DESC);

DO $$ BEGIN
  CREATE TRIGGER proc_package_members_append_only
    BEFORE UPDATE OR DELETE ON proc_package_members
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================
-- Tavoitearviorivi (budget_line_id) -> paketti -kytkentä ilman splittiä
-- =========================
CREATE TABLE IF NOT EXISTS package_budget_line_links (
  package_budget_line_link_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  budget_line_id uuid NOT NULL REFERENCES budget_lines(budget_line_id) ON DELETE RESTRICT,
  work_package_id uuid NOT NULL REFERENCES work_packages(id) ON DELETE RESTRICT,
  proc_package_id uuid REFERENCES proc_packages(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL DEFAULT 'system',
  CONSTRAINT package_budget_line_links_no_split UNIQUE (budget_line_id)
);

CREATE INDEX IF NOT EXISTS ix_package_budget_line_links_work_package
  ON package_budget_line_links(work_package_id, created_at DESC, package_budget_line_link_id DESC);

CREATE INDEX IF NOT EXISTS ix_package_budget_line_links_proc_package
  ON package_budget_line_links(proc_package_id, created_at DESC, package_budget_line_link_id DESC);

CREATE INDEX IF NOT EXISTS ix_package_budget_line_links_project_time
  ON package_budget_line_links(project_id, created_at DESC, package_budget_line_link_id DESC);

DO $$ BEGIN
  CREATE TRIGGER package_budget_line_links_append_only
    BEFORE UPDATE OR DELETE ON package_budget_line_links
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION package_budget_line_links_validate()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_budget_project_id uuid;
  v_work_project_id uuid;
  v_proc_project_id uuid;
BEGIN
  SELECT bl.project_id INTO v_budget_project_id
  FROM budget_lines bl
  WHERE bl.budget_line_id = NEW.budget_line_id;

  IF v_budget_project_id IS NULL THEN
    RAISE EXCEPTION 'budget_line_id ei loydy: %', NEW.budget_line_id;
  END IF;

  SELECT wp.project_id INTO v_work_project_id
  FROM work_packages wp
  WHERE wp.id = NEW.work_package_id;

  IF v_work_project_id IS NULL THEN
    RAISE EXCEPTION 'work_package_id ei loydy: %', NEW.work_package_id;
  END IF;

  IF NEW.proc_package_id IS NOT NULL THEN
    SELECT pp.project_id INTO v_proc_project_id
    FROM proc_packages pp
    WHERE pp.id = NEW.proc_package_id;

    IF v_proc_project_id IS NULL THEN
      RAISE EXCEPTION 'proc_package_id ei loydy: %', NEW.proc_package_id;
    END IF;
  END IF;

  IF NEW.project_id <> v_budget_project_id THEN
    RAISE EXCEPTION 'project_id ei vastaa budget_lines.project_id: project_id=% budget_project_id=%', NEW.project_id, v_budget_project_id;
  END IF;

  IF NEW.project_id <> v_work_project_id THEN
    RAISE EXCEPTION 'project_id ei vastaa work_packages.project_id: project_id=% work_project_id=%', NEW.project_id, v_work_project_id;
  END IF;

  IF NEW.proc_package_id IS NOT NULL AND NEW.project_id <> v_proc_project_id THEN
    RAISE EXCEPTION 'project_id ei vastaa proc_packages.project_id: project_id=% proc_project_id=%', NEW.project_id, v_proc_project_id;
  END IF;

  RETURN NEW;
END;
$$;

DO $$ BEGIN
  CREATE TRIGGER package_budget_line_links_validate
    BEFORE INSERT ON package_budget_line_links
    FOR EACH ROW EXECUTE FUNCTION package_budget_line_links_validate();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMIT;

