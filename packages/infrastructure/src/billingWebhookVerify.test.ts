import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { verifyBillingWebhook } from "./billingWebhookVerify";

const stripeHeader = (rawBody: Uint8Array, secret: string, ts: number) => {
  const h = crypto.createHmac("sha256", secret);
  h.update(Buffer.from(`${ts}.`, "utf8"));
  h.update(rawBody);
  const sig = h.digest("hex");
  return `t=${ts},v1=${sig}`;
};

const paddleHeader = (rawBody: Uint8Array, secret: string, ts: number) => {
  const h = crypto.createHmac("sha256", secret);
  h.update(Buffer.from(`${ts}:`, "utf8"));
  h.update(rawBody);
  const sig = h.digest("hex");
  return `ts=${ts},h1=${sig}`;
};

test("verifyBillingWebhook(stripe) hyväksyy valid signature (raw bytes)", () => {
  const env = {
    STRIPE_WEBHOOK_SECRET: "whsec_test",
    STRIPE_WEBHOOK_TOLERANCE_SECONDS: "300"
  } as NodeJS.ProcessEnv;

  const nowMs = Date.now();
  const ts = Math.floor(nowMs / 1000);
  const rawBody = Buffer.from('{"id":"evt_1","type":"test"}', "utf8");

  const result = verifyBillingWebhook("stripe", rawBody, { "stripe-signature": stripeHeader(rawBody, env.STRIPE_WEBHOOK_SECRET!, ts) }, { env, nowMs });
  assert.equal(result.ok, true);
});

test("verifyBillingWebhook(stripe) hylkää invalid signature", () => {
  const env = {
    STRIPE_WEBHOOK_SECRET: "whsec_test",
    STRIPE_WEBHOOK_TOLERANCE_SECONDS: "300"
  } as NodeJS.ProcessEnv;

  const nowMs = Date.now();
  const rawBody = Buffer.from('{"id":"evt_1","type":"test"}', "utf8");

  const result = verifyBillingWebhook("stripe", rawBody, { "stripe-signature": "t=1,v1=deadbeef" }, { env, nowMs });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.httpStatus, 401);
  }
});

test("verifyBillingWebhook(paddle) hyväksyy valid signature (raw bytes)", () => {
  const env = {
    PADDLE_WEBHOOK_SECRET: "paddle_test",
    PADDLE_WEBHOOK_TOLERANCE_SECONDS: "300"
  } as NodeJS.ProcessEnv;

  const nowMs = Date.now();
  const ts = Math.floor(nowMs / 1000);
  const rawBody = Buffer.from('{"id":"evt_1","type":"test"}', "utf8");

  const result = verifyBillingWebhook(
    "paddle",
    rawBody,
    { "paddle-signature": paddleHeader(rawBody, env.PADDLE_WEBHOOK_SECRET!, ts) },
    { env, nowMs }
  );
  assert.equal(result.ok, true);
});

