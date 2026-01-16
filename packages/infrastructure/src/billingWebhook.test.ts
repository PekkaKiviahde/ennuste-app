import { after, test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { Client } from "pg";
import { POST as billingWebhookPost } from "../../../apps/web/src/app/api/billing/webhook/[provider]/route";
import { pool } from "./db";

const databaseUrl = process.env.DATABASE_URL ?? "";

after(async () => {
  await pool.end();
});

const stripeSignatureHeader = (rawBody: Uint8Array, secret: string, timestampSeconds: number) => {
  const h = crypto.createHmac("sha256", secret);
  h.update(Buffer.from(`${timestampSeconds}.`, "utf8"));
  h.update(rawBody);
  const sig = h.digest("hex");
  return `t=${timestampSeconds},v1=${sig}`;
};

test("billing webhook (stripe): valid signature -> 2xx + processed + idempotent", { skip: !databaseUrl }, async () => {
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";
  process.env.STRIPE_WEBHOOK_TOLERANCE_SECONDS = "300";

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  const rawBody = JSON.stringify({
    id: `evt_${crypto.randomUUID().slice(0, 8)}`,
    type: "checkout.session.completed",
    data: { object: { id: "cs_test_123", customer_email: "test@example.com" } }
  });
  const rawBodyBytes = Buffer.from(rawBody, "utf8");

  const ts = Math.floor(Date.now() / 1000);
  const signature = stripeSignatureHeader(rawBodyBytes, process.env.STRIPE_WEBHOOK_SECRET, ts);

  const request = new Request("http://localhost/api/billing/webhook/stripe", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": signature
    },
    body: rawBody
  });

  const response = await billingWebhookPost(request, { params: { provider: "stripe" } });
  assert.ok(response.status >= 200 && response.status < 300);

  const check = await client.query(
    "SELECT status, signature_valid, processed_at FROM billing_webhook_events WHERE provider = 'stripe' AND provider_event_id = $1::text",
    [JSON.parse(rawBody).id]
  );
  assert.equal(check.rowCount, 1);
  assert.equal(check.rows[0].status, "PROCESSED");
  assert.equal(check.rows[0].signature_valid, true);
  assert.ok(check.rows[0].processed_at);

  const retryResponse = await billingWebhookPost(request, { params: { provider: "stripe" } });
  assert.ok(retryResponse.status >= 200 && retryResponse.status < 300);

  const count = await client.query(
    "SELECT count(*)::int AS n FROM billing_webhook_events WHERE provider = 'stripe' AND provider_event_id = $1::text",
    [JSON.parse(rawBody).id]
  );
  assert.equal(count.rows[0].n, 1);

  await client.end();
});

test("billing webhook (stripe): invalid signature -> 401/400 + REJECTED", { skip: !databaseUrl }, async () => {
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  const rawBody = JSON.stringify({
    id: `evt_${crypto.randomUUID().slice(0, 8)}`,
    type: "checkout.session.completed"
  });
  const rawBodyBytes = Buffer.from(rawBody, "utf8");

  const request = new Request("http://localhost/api/billing/webhook/stripe", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": "t=1,v1=deadbeef"
    },
    body: rawBody
  });

  const response = await billingWebhookPost(request, { params: { provider: "stripe" } });
  assert.ok(response.status === 401 || response.status === 400);

  const rawSha = crypto.createHash("sha256").update(rawBodyBytes).digest("hex");
  const check = await client.query(
    "SELECT status, signature_valid FROM billing_webhook_events WHERE provider = 'stripe' AND provider_event_id = $1::text",
    [`rejected:${rawSha}`]
  );
  assert.equal(check.rowCount, 1);
  assert.equal(check.rows[0].status, "REJECTED");
  assert.equal(check.rows[0].signature_valid, false);

  await client.end();
});
