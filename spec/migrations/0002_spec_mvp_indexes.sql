-- 0002_spec_mvp_indexes.sql
-- Raportoinnin indeksisuositukset (spec)
-- Lahe: spec/data-model/04_reporting_indexes.md

-- Ennuste: uusin tapahtuma per target_littera
CREATE INDEX ix_forecast_event_target_time ON forecast_event (target_littera_id, event_time DESC);

-- Mappingin haku voimassaoloajalla
CREATE INDEX ix_mapping_version_project_validity ON mapping_version (project_id, valid_from, valid_to);

-- Toteumat projekti + ajanjakso
CREATE INDEX ix_actual_project_period_cost ON actual_cost_line (project_id, period, cost_type);

-- Budjetti projekti + target + cost_type
CREATE INDEX ix_budget_project_target_cost ON budget_line (project_id, target_littera_id, cost_type);

-- Mapping rivit: work_littera + cost_type (kohdistus)
CREATE INDEX ix_mapping_line_work_cost ON mapping_line (work_littera_id, cost_type);
