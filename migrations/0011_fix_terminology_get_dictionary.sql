-- 0011_fix_terminology_get_dictionary.sql
-- Hotfix: korjaa terminology_get_dictionary() ambiguity (term_key)
-- Päivitetty: 2025-12-19
-- Tausta: PL/pgSQL:ssä term_key oli sekä RETURNS TABLE -kenttä että sarake -> ambiguous reference.
-- Tämä migraatio on turvallinen ajaa koska se käyttää CREATE OR REPLACE FUNCTION.

BEGIN;

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
  WITH term_keys AS (
    SELECT DISTINCT t.term_key
    FROM v_terminology_current t
    WHERE (t.organization_id IS NULL OR t.organization_id = p_organization_id)
      AND t.locale IN (p_locale, p_fallback_locale)
  )
  SELECT
    k.term_key,
    r.label,
    r.description,
    r.locale_used,
    r.source
  FROM term_keys k
  CROSS JOIN LATERAL terminology_resolve_term(
    p_organization_id,
    p_locale,
    k.term_key,
    p_fallback_locale
  ) r
  ORDER BY k.term_key;
END $$;

COMMIT;
