-- 0041_billing_webhook_events.sql
-- Billing webhook -tapahtumien vastaanotto + idempotenssi + audit (redaktoitu payload).

BEGIN;

CREATE TABLE IF NOT EXISTS billing_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  provider_event_id text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz,
  processed_at timestamptz,
  status text NOT NULL,
  signature_valid boolean NOT NULL DEFAULT false,
  raw_body_sha256 text NOT NULL,
  payload_redacted jsonb,
  error text
);

CREATE UNIQUE INDEX IF NOT EXISTS billing_webhook_events_provider_event_id_uniq
  ON billing_webhook_events(provider, provider_event_id);

CREATE INDEX IF NOT EXISTS billing_webhook_events_received_at_idx
  ON billing_webhook_events(received_at DESC);

COMMIT;

