-- 0028_planning_forecast_permissions.sql
-- Lisaa suunnitelma- ja ennustetapahtuman kirjoitusoikeudet

BEGIN;

INSERT INTO permissions (permission_code, description)
VALUES
  ('PLANNING_WRITE', 'Saa kirjata suunnitelman'),
  ('FORECAST_WRITE', 'Saa kirjata ennustetapahtuman')
ON CONFLICT (permission_code) DO NOTHING;

INSERT INTO role_permissions (role_code, permission_code)
VALUES
  ('SITE_FOREMAN', 'PLANNING_WRITE'),
  ('GENERAL_FOREMAN', 'PLANNING_WRITE'),
  ('PROJECT_MANAGER', 'PLANNING_WRITE'),
  ('PROJECT_MANAGER', 'FORECAST_WRITE'),
  ('PRODUCTION_MANAGER', 'FORECAST_WRITE')
ON CONFLICT DO NOTHING;

COMMIT;
