-- 0032_agent_memory.sql
-- Agenttiarmeijan pysyvä muisti (append-only)
-- HUOM: Numerointi pidetään kasvavana (0031 -> 0032 -> ...).
-- Edellyttää prevent_update_delete() -funktiota (luotu 0001_baseline.sql:ssa).

CREATE TABLE IF NOT EXISTS agent_sessions (
  agent_session_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL DEFAULT 'agent',
  status text NOT NULL DEFAULT 'OPEN'
);

CREATE TABLE IF NOT EXISTS agent_events (
  agent_event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_session_id uuid NOT NULL REFERENCES agent_sessions(agent_session_id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  event_type text NOT NULL,
  payload jsonb NOT NULL
);

-- Append-only: estetään UPDATE ja DELETE
DO $$ BEGIN
  CREATE TRIGGER agent_sessions_append_only
    BEFORE UPDATE OR DELETE ON agent_sessions
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER agent_events_append_only
    BEFORE UPDATE OR DELETE ON agent_events
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
