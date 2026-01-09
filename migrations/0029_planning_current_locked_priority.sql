-- 0029_planning_current_locked_priority.sql
-- Päivitetty: 2026-01-09

-- Current planning (locked wins, then newest)
CREATE OR REPLACE VIEW v_planning_current AS
SELECT
  selected.project_id,
  selected.target_littera_id,
  selected.planning_event_id,
  selected.event_time,
  selected.created_by,
  selected.status,
  selected.summary,
  selected.observations,
  selected.risks,
  selected.decisions,
  selected.attachments
FROM (
  SELECT
    pe.*,
    ROW_NUMBER() OVER (
      PARTITION BY pe.project_id, pe.target_littera_id
      ORDER BY
        (pe.status = 'LOCKED') DESC,
        COALESCE(pe.event_time, '1970-01-01'::timestamp) DESC,
        pe.planning_event_id DESC
    ) AS row_rank
  FROM planning_events pe
) AS selected
WHERE selected.row_rank = 1;
