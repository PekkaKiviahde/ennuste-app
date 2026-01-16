import type { BillingWebhookPort } from "@ennuste/application";
import { AppError } from "@ennuste/shared";
import { query } from "./db";
import { sha256HexFromBytes, verifyBillingWebhook } from "./billingWebhookVerify";

const extractProviderEventId = (provider: string, payload: any) => {
  const candidate = payload?.id || payload?.event_id || payload?.eventId;
  if (typeof candidate === "string" && candidate.trim() !== "") {
    return candidate.trim();
  }
  if (provider === "chargebee") {
    const cb = payload?.event?.id;
    if (typeof cb === "string" && cb.trim() !== "") {
      return cb.trim();
    }
  }
  return null;
};

const redactValue = (value: unknown, depth = 0): unknown => {
  if (depth > 6) {
    return "[TRUNCATED]";
  }
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value === "string") {
    return value.length > 256 ? `${value.slice(0, 256)}…` : value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length > 50) {
      return [...value.slice(0, 50).map((v) => redactValue(v, depth + 1)), "[…]"];
    }
    return value.map((v) => redactValue(v, depth + 1));
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    const keys = Object.keys(obj).slice(0, 200);
    for (const key of keys) {
      const lower = key.toLowerCase();
      if (
        lower.includes("secret") ||
        lower.includes("password") ||
        lower.includes("token") ||
        lower.includes("authorization") ||
        lower.includes("card") ||
        lower.includes("iban") ||
        lower.includes("bic") ||
        lower.includes("account") ||
        lower.includes("email") ||
        lower.includes("phone") ||
        lower.includes("address")
      ) {
        out[key] = "[REDACTED]";
      } else {
        out[key] = redactValue(obj[key], depth + 1);
      }
    }
    if (Object.keys(obj).length > keys.length) {
      out["…"] = "[TRUNCATED_KEYS]";
    }
    return out;
  }
  return "[UNSUPPORTED]";
};

export const billingWebhookRepository = (): BillingWebhookPort => ({
  async consumeWebhook(input) {
    const provider = String(input.provider || "").trim().toLowerCase();
    if (!provider) {
      throw new AppError("provider puuttuu.", "BILLING_WEBHOOK_PROVIDER_MISSING", 400);
    }

    const rawBody = input.rawBody;
    const rawSha = sha256HexFromBytes(rawBody);
    const receivedAt = new Date();

    const verification = verifyBillingWebhook(provider, rawBody, input.headers || {});
    const now = new Date();

    const insertEvent = async (params: {
      providerEventId: string;
      status: string;
      signatureValid: boolean;
      verifiedAt: Date | null;
      processedAt: Date | null;
      payloadRedacted: unknown | null;
      error: string | null;
    }) => {
      const result = await query<{ id: string }>(
        `INSERT INTO billing_webhook_events
           (provider, provider_event_id, received_at, verified_at, processed_at, status, signature_valid, raw_body_sha256, payload_redacted, error)
         VALUES
           ($1::text, $2::text, $3::timestamptz, $4::timestamptz, $5::timestamptz, $6::text, $7::boolean, $8::text, $9::jsonb, $10::text)
         ON CONFLICT (provider, provider_event_id) DO NOTHING
         RETURNING id`,
        [
          provider,
          params.providerEventId,
          receivedAt,
          params.verifiedAt,
          params.processedAt,
          params.status,
          params.signatureValid,
          rawSha,
          params.payloadRedacted,
          params.error
        ]
      );
      return result.rows[0]?.id ?? null;
    };

    if (!verification.ok) {
      const providerEventId = `rejected:${rawSha}`;
      const insertedId = await insertEvent({
        providerEventId,
        status: "REJECTED",
        signatureValid: false,
        verifiedAt: now,
        processedAt: null,
        payloadRedacted: null,
        error: verification.error
      });

      if (!insertedId) {
        return { outcome: "DUPLICATE", httpStatus: 204 };
      }
      return { outcome: "REJECTED", httpStatus: verification.httpStatus, message: verification.error };
    }

    let payload: unknown;
    const rawText = Buffer.from(rawBody).toString("utf8");
    try {
      payload = JSON.parse(rawText);
    } catch {
      const providerEventId = `rejected:${rawSha}`;
      const insertedId = await insertEvent({
        providerEventId,
        status: "REJECTED",
        signatureValid: false,
        verifiedAt: now,
        processedAt: null,
        payloadRedacted: null,
        error: "Webhook body ei ole validia JSON:ia."
      });
      if (!insertedId) {
        return { outcome: "DUPLICATE", httpStatus: 204 };
      }
      return { outcome: "REJECTED", httpStatus: 400, message: "Webhook body ei ole validia JSON:ia." };
    }

    const providerEventId = extractProviderEventId(provider, payload);
    if (!providerEventId) {
      const fallbackId = `rejected:${rawSha}`;
      const insertedId = await insertEvent({
        providerEventId: fallbackId,
        status: "REJECTED",
        signatureValid: false,
        verifiedAt: now,
        processedAt: null,
        payloadRedacted: null,
        error: "provider_event_id puuttuu webhook-payloadista."
      });
      if (!insertedId) {
        return { outcome: "DUPLICATE", httpStatus: 204 };
      }
      return { outcome: "REJECTED", httpStatus: 400, message: "provider_event_id puuttuu webhook-payloadista." };
    }

    const redacted = redactValue(payload);
    const insertedId = await insertEvent({
      providerEventId,
      status: "VERIFIED",
      signatureValid: true,
      verifiedAt: now,
      processedAt: null,
      payloadRedacted: redacted,
      error: null
    });

    if (!insertedId) {
      return { outcome: "DUPLICATE", httpStatus: 204 };
    }

    try {
      await query(
        "UPDATE billing_webhook_events SET processed_at = now(), status = 'PROCESSED' WHERE id = $1::uuid",
        [insertedId]
      );
      return { outcome: "PROCESSED", httpStatus: 204 };
    } catch (error: any) {
      await query(
        "UPDATE billing_webhook_events SET status = 'ERROR', error = $2::text WHERE id = $1::uuid",
        [insertedId, String(error?.message || "Tuntematon virhe")]
      );
      throw error;
    }
  }
});
