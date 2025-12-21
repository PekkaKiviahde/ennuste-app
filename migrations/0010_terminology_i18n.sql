-- 0010_terminology_i18n.sql
-- Phase 20 (SaaS v1+): Terminologia + monikielisyys + yrityskohtaiset termit (normalisoitu)
-- Päivitetty: 2025-12-19
-- Periaate: laskentasäännöt & metric-koodit pysyvät vakiona, UI-nimet vaihdettavissa (org + locale).
-- Toteutus: append-only termit (effective_from/effective_to) -> audit säilyy.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 0) Permission, jotta termien muokkaus voidaan lukita ORG_ADMIN:lle
INSERT INTO permissions (permission_code, description)
VALUES ('TERMINOLOGY_MANAGE', 'Saa muokata organisaation sanastoa ja käännöksiä')
ON CONFLICT (permission_code) DO NOTHING;

INSERT INTO role_permissions (role_code, permission_code)
VALUES ('ORG_ADMIN', 'TERMINOLOGY_MANAGE')
ON CONFLICT DO NOTHING;

-- 1) Terminologia-taulu (append-only)
CREATE TABLE IF NOT EXISTS terminology_terms (
  terminology_term_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- NULL = järjestelmän oletustermit (global defaults)
  organization_id uuid NULL REFERENCES organizations(organization_id),

  -- esim. 'fi', 'en', 'sv', 'en-GB' jne.
  locale text NOT NULL,

  -- esim. 'term.work_phase', 'metric.bac'
  term_key text NOT NULL,

  label text NOT NULL,
  description text NULL,

  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_to timestamptz NULL,

  updated_by text NOT NULL,
  change_reason text NULL
);

CREATE INDEX IF NOT EXISTS idx_terminology_lookup
  ON terminology_terms (organization_id, locale, term_key, effective_from DESC);

-- Vain yksi aktiivinen termi per (org, locale, key)
CREATE UNIQUE INDEX IF NOT EXISTS ux_terminology_active
  ON terminology_terms (organization_id, locale, term_key)
  WHERE effective_to IS NULL;

CREATE OR REPLACE VIEW v_terminology_current AS
SELECT
  organization_id,
  locale,
  term_key,
  label,
  description,
  effective_from,
  updated_by,
  change_reason
FROM terminology_terms
WHERE effective_to IS NULL;

-- 2) Org-permission tarkistus (RBAC-laajennus)
CREATE OR REPLACE FUNCTION rbac_user_has_org_permission(
  p_organization_id uuid,
  p_username text,
  p_permission_code text
) RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT rbac_get_user_id(p_username) INTO v_user_id;
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM organization_role_assignments ora
    JOIN role_permissions rp
      ON rp.role_code = ora.role_code
     AND rp.permission_code = p_permission_code
    WHERE ora.organization_id = p_organization_id
      AND ora.user_id = v_user_id
      AND ora.revoked_at IS NULL
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END $$;

CREATE OR REPLACE FUNCTION rbac_assert_org_permission(
  p_organization_id uuid,
  p_username text,
  p_permission_code text
) RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT rbac_user_has_org_permission(p_organization_id, p_username, p_permission_code) THEN
    RAISE EXCEPTION 'RBAC: user % missing org permission % for organization %',
      p_username, p_permission_code, p_organization_id;
  END IF;
END $$;

-- 3) Terminologia: aseta termi (append-only)
--    - sulkee vanhan aktiivisen rivin (effective_to=now())
--    - lisää uuden aktiivisen rivin
CREATE OR REPLACE FUNCTION terminology_set_term(
  p_organization_id uuid,
  p_locale text,
  p_term_key text,
  p_label text,
  p_description text,
  p_updated_by text,
  p_change_reason text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_id uuid;
BEGIN
  -- Close previous active row (if any)
  UPDATE terminology_terms
  SET effective_to = now()
  WHERE organization_id IS NOT DISTINCT FROM p_organization_id
    AND locale = p_locale
    AND term_key = p_term_key
    AND effective_to IS NULL;

  -- Insert new row
  INSERT INTO terminology_terms (
    organization_id, locale, term_key, label, description,
    effective_from, effective_to, updated_by, change_reason
  ) VALUES (
    p_organization_id, p_locale, p_term_key, p_label, p_description,
    now(), NULL, p_updated_by, p_change_reason
  )
  RETURNING terminology_term_id INTO v_new_id;

  RETURN v_new_id;
END $$;

-- Secure wrapper (ORG_ADMIN / TERMINOLOGY_MANAGE)
CREATE OR REPLACE FUNCTION terminology_set_term_secure(
  p_organization_id uuid,
  p_locale text,
  p_term_key text,
  p_label text,
  p_description text,
  p_username text,
  p_change_reason text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM rbac_assert_org_permission(p_organization_id, p_username, 'TERMINOLOGY_MANAGE');

  RETURN terminology_set_term(
    p_organization_id,
    p_locale,
    p_term_key,
    p_label,
    p_description,
    p_username,
    p_change_reason
  );
END $$;

-- 4) Resolve (org override -> global default, locale -> fallback_locale)
CREATE OR REPLACE FUNCTION terminology_resolve_term(
  p_organization_id uuid,
  p_locale text,
  p_term_key text,
  p_fallback_locale text DEFAULT 'en'
) RETURNS TABLE (
  label text,
  description text,
  locale_used text,
  source text
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- 1) org + locale
  RETURN QUERY
  SELECT t.label, t.description, t.locale, 'org'
  FROM v_terminology_current t
  WHERE t.organization_id = p_organization_id
    AND t.locale = p_locale
    AND t.term_key = p_term_key
  LIMIT 1;

  IF FOUND THEN
    RETURN;
  END IF;

  -- 2) global + locale
  RETURN QUERY
  SELECT t.label, t.description, t.locale, 'global'
  FROM v_terminology_current t
  WHERE t.organization_id IS NULL
    AND t.locale = p_locale
    AND t.term_key = p_term_key
  LIMIT 1;

  IF FOUND THEN
    RETURN;
  END IF;

  -- 3) org + fallback
  RETURN QUERY
  SELECT t.label, t.description, t.locale, 'org_fallback'
  FROM v_terminology_current t
  WHERE t.organization_id = p_organization_id
    AND t.locale = p_fallback_locale
    AND t.term_key = p_term_key
  LIMIT 1;

  IF FOUND THEN
    RETURN;
  END IF;

  -- 4) global + fallback
  RETURN QUERY
  SELECT t.label, t.description, t.locale, 'global_fallback'
  FROM v_terminology_current t
  WHERE t.organization_id IS NULL
    AND t.locale = p_fallback_locale
    AND t.term_key = p_term_key
  LIMIT 1;

  IF FOUND THEN
    RETURN;
  END IF;

  -- 5) fallback to key itself
  RETURN QUERY
  SELECT p_term_key::text, NULL::text, p_locale::text, 'missing';
END $$;

-- 5) Dictionary helper (UI voi hakea kaikki keyt kerralla)
CREATE OR REPLACE FUNCTION terminology_get_dictionary(
  p_organization_id uuid,
  p_locale text,
  p_fallback_locale text DEFAULT 'en'
) RETURNS TABLE (
  term_key text,
  label text,
  description text,
  locale_used text,
  source text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH keys AS (
    SELECT DISTINCT term_key
    FROM v_terminology_current
    WHERE (organization_id IS NULL OR organization_id = p_organization_id)
      AND locale IN (p_locale, p_fallback_locale)
  )
  SELECT
    k.term_key,
    r.label,
    r.description,
    r.locale_used,
    r.source
  FROM keys k
  CROSS JOIN LATERAL terminology_resolve_term(p_organization_id, p_locale, k.term_key, p_fallback_locale) r
  ORDER BY k.term_key;
END $$;

-- 6) Seed: järjestelmän oletustermit (global)
DO $seed_terms$
BEGIN
  -- FI
  IF NOT EXISTS (SELECT 1 FROM v_terminology_current WHERE organization_id IS NULL AND locale='fi' AND term_key='term.project') THEN
    PERFORM terminology_set_term(NULL,'fi','term.project','Projekti',NULL,'system','seed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM v_terminology_current WHERE organization_id IS NULL AND locale='fi' AND term_key='term.work_phase') THEN
    PERFORM terminology_set_term(NULL,'fi','term.work_phase','Työvaihe', 'Työvaihe = looginen kokonaisuus / työpaketti.', 'system','seed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM v_terminology_current WHERE organization_id IS NULL AND locale='fi' AND term_key='metric.bac') THEN
    PERFORM terminology_set_term(NULL,'fi','metric.bac','Tavoite (baseline) €','BAC = lukittu baseline (Budget at Completion).','system','seed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM v_terminology_current WHERE organization_id IS NULL AND locale='fi' AND term_key='metric.ac') THEN
    PERFORM terminology_set_term(NULL,'fi','metric.ac','Toteuma €','AC = kirjanpidosta/JYDA:sta tuleva toteuma.','system','seed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM v_terminology_current WHERE organization_id IS NULL AND locale='fi' AND term_key='metric.ghost_open') THEN
    PERFORM terminology_set_term(NULL,'fi','metric.ghost_open','Haamukulut (avoimet) €','Työmaan kirjaamat kulut, joita ei ole vielä toteumassa (viive).','system','seed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM v_terminology_current WHERE organization_id IS NULL AND locale='fi' AND term_key='metric.ac_star') THEN
    PERFORM terminology_set_term(NULL,'fi','metric.ac_star','Toteuma + haamut (AC*) €','AC* = AC + haamukulut.','system','seed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM v_terminology_current WHERE organization_id IS NULL AND locale='fi' AND term_key='metric.percent_complete') THEN
    PERFORM terminology_set_term(NULL,'fi','metric.percent_complete','Valmiusaste %','Työvaiheen tekninen valmiusaste (0–100).','system','seed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM v_terminology_current WHERE organization_id IS NULL AND locale='fi' AND term_key='metric.ev') THEN
    PERFORM terminology_set_term(NULL,'fi','metric.ev','EV €','EV = BAC × valmiusaste.','system','seed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM v_terminology_current WHERE organization_id IS NULL AND locale='fi' AND term_key='metric.cpi') THEN
    PERFORM terminology_set_term(NULL,'fi','metric.cpi','CPI','CPI = EV / AC*.','system','seed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM v_terminology_current WHERE organization_id IS NULL AND locale='fi' AND term_key='term.selvitettavat') THEN
    PERFORM terminology_set_term(NULL,'fi','term.selvitettavat','Selvitettävät','Toteumat, joita ei ole kohdistettu työvaiheelle.','system','seed');
  END IF;

  -- EN
  IF NOT EXISTS (SELECT 1 FROM v_terminology_current WHERE organization_id IS NULL AND locale='en' AND term_key='term.project') THEN
    PERFORM terminology_set_term(NULL,'en','term.project','Project',NULL,'system','seed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM v_terminology_current WHERE organization_id IS NULL AND locale='en' AND term_key='term.work_phase') THEN
    PERFORM terminology_set_term(NULL,'en','term.work_phase','Work phase','Work phase = logical work package.', 'system','seed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM v_terminology_current WHERE organization_id IS NULL AND locale='en' AND term_key='metric.bac') THEN
    PERFORM terminology_set_term(NULL,'en','metric.bac','Baseline €','BAC = locked baseline (Budget at Completion).','system','seed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM v_terminology_current WHERE organization_id IS NULL AND locale='en' AND term_key='metric.ac') THEN
    PERFORM terminology_set_term(NULL,'en','metric.ac','Actual €','AC = actual cost (from accounting/import).','system','seed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM v_terminology_current WHERE organization_id IS NULL AND locale='en' AND term_key='metric.ghost_open') THEN
    PERFORM terminology_set_term(NULL,'en','metric.ghost_open','Ghost (open) €','Costs known on site but not yet in actuals.','system','seed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM v_terminology_current WHERE organization_id IS NULL AND locale='en' AND term_key='metric.ac_star') THEN
    PERFORM terminology_set_term(NULL,'en','metric.ac_star','AC* (Actual + Ghost) €','AC* = AC + ghost.','system','seed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM v_terminology_current WHERE organization_id IS NULL AND locale='en' AND term_key='metric.percent_complete') THEN
    PERFORM terminology_set_term(NULL,'en','metric.percent_complete','% complete','Technical percent complete (0–100).','system','seed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM v_terminology_current WHERE organization_id IS NULL AND locale='en' AND term_key='metric.ev') THEN
    PERFORM terminology_set_term(NULL,'en','metric.ev','EV €','EV = BAC × percent complete.','system','seed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM v_terminology_current WHERE organization_id IS NULL AND locale='en' AND term_key='metric.cpi') THEN
    PERFORM terminology_set_term(NULL,'en','metric.cpi','CPI','CPI = EV / AC*.','system','seed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM v_terminology_current WHERE organization_id IS NULL AND locale='en' AND term_key='term.selvitettavat') THEN
    PERFORM terminology_set_term(NULL,'en','term.selvitettavat','Unmapped actuals','Actuals not mapped to any work phase.','system','seed');
  END IF;
END
$seed_terms$;

COMMIT;
