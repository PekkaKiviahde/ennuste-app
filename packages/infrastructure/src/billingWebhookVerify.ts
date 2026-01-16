import crypto from "node:crypto";

export type BillingWebhookVerifyResult =
  | { ok: true; timestampSeconds?: number }
  | { ok: false; httpStatus: number; error: string };

const timingSafeEqualHex = (aHex: string, bHex: string) => {
  const a = Buffer.from(aHex, "hex");
  const b = Buffer.from(bHex, "hex");
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(a, b);
};

const parseKeyValueHeader = (raw: string) => {
  const out: Record<string, string> = {};
  for (const part of raw.split(",")) {
    const [key, ...rest] = part.trim().split("=");
    if (!key || rest.length === 0) {
      continue;
    }
    out[key.trim()] = rest.join("=").trim();
  }
  return out;
};

const getHeader = (headers: Record<string, string>, name: string) =>
  headers[name.toLowerCase()] ?? "";

const hmacHex = (secret: string, parts: Uint8Array[]) => {
  const h = crypto.createHmac("sha256", secret);
  for (const part of parts) {
    h.update(part);
  }
  return h.digest("hex");
};

export const sha256HexFromBytes = (value: Uint8Array) =>
  crypto.createHash("sha256").update(value).digest("hex");

export const verifyBillingWebhook = (
  provider: string,
  rawBody: Uint8Array,
  headers: Record<string, string>,
  {
    nowMs = Date.now(),
    env = process.env
  }: { nowMs?: number; env?: NodeJS.ProcessEnv } = {}
): BillingWebhookVerifyResult => {
  const normalized = String(provider || "").trim().toLowerCase();
  if (!normalized) {
    return { ok: false, httpStatus: 400, error: "provider puuttuu." };
  }

  if (normalized === "stripe") {
    const secret = env.STRIPE_WEBHOOK_SECRET || "";
    if (!secret) {
      return { ok: false, httpStatus: 500, error: "STRIPE_WEBHOOK_SECRET puuttuu." };
    }
    const header = getHeader(headers, "stripe-signature");
    if (!header) {
      return { ok: false, httpStatus: 400, error: "Stripe-Signature puuttuu." };
    }

    const parts = parseKeyValueHeader(header);
    const ts = Number(parts.t || "");
    if (!Number.isFinite(ts)) {
      return { ok: false, httpStatus: 400, error: "Stripe-Signature timestamp on virheellinen." };
    }
    const toleranceSeconds = Number(env.STRIPE_WEBHOOK_TOLERANCE_SECONDS || "") || 300;
    const nowSeconds = Math.floor(nowMs / 1000);
    if (Math.abs(nowSeconds - ts) > toleranceSeconds) {
      return { ok: false, httpStatus: 401, error: "Stripe webhook timestamp on vanhentunut." };
    }

    const v1 = (parts.v1 || "").toLowerCase();
    if (!v1 || !/^[0-9a-f]+$/.test(v1)) {
      return { ok: false, httpStatus: 401, error: "Stripe webhook allekirjoitus puuttuu tai on virheellinen." };
    }

    const expected = hmacHex(secret, [Buffer.from(`${ts}.`, "utf8"), rawBody]);
    if (!timingSafeEqualHex(expected, v1)) {
      return { ok: false, httpStatus: 401, error: "Stripe webhook allekirjoitus ei täsmää." };
    }
    return { ok: true, timestampSeconds: ts };
  }

  if (normalized === "paddle") {
    const secret = env.PADDLE_WEBHOOK_SECRET || "";
    if (!secret) {
      return { ok: false, httpStatus: 500, error: "PADDLE_WEBHOOK_SECRET puuttuu." };
    }
    const header = getHeader(headers, "paddle-signature");
    if (!header) {
      return { ok: false, httpStatus: 400, error: "Paddle-Signature puuttuu." };
    }

    const parts = parseKeyValueHeader(header);
    const ts = Number(parts.ts || "");
    const h1 = (parts.h1 || "").toLowerCase();
    if (!Number.isFinite(ts) || !h1 || !/^[0-9a-f]+$/.test(h1)) {
      return { ok: false, httpStatus: 401, error: "Paddle webhook allekirjoitus on virheellinen." };
    }

    const toleranceSeconds = Number(env.PADDLE_WEBHOOK_TOLERANCE_SECONDS || "") || 300;
    const nowSeconds = Math.floor(nowMs / 1000);
    if (Math.abs(nowSeconds - ts) > toleranceSeconds) {
      return { ok: false, httpStatus: 401, error: "Paddle webhook timestamp on vanhentunut." };
    }

    const expected = hmacHex(secret, [Buffer.from(`${ts}:`, "utf8"), rawBody]);
    if (!timingSafeEqualHex(expected, h1)) {
      return { ok: false, httpStatus: 401, error: "Paddle webhook allekirjoitus ei täsmää." };
    }
    return { ok: true, timestampSeconds: ts };
  }

  if (normalized === "chargebee") {
    const username = env.CHARGEBEE_WEBHOOK_USERNAME || "";
    const password = env.CHARGEBEE_WEBHOOK_PASSWORD || "";
    if (!username || !password) {
      return { ok: false, httpStatus: 500, error: "CHARGEBEE_WEBHOOK_USERNAME/CHARGEBEE_WEBHOOK_PASSWORD puuttuu." };
    }

    const auth = getHeader(headers, "authorization");
    if (!auth.toLowerCase().startsWith("basic ")) {
      return { ok: false, httpStatus: 401, error: "Authorization (Basic) puuttuu." };
    }

    const expected = Buffer.from(`${username}:${password}`, "utf8").toString("base64");
    const actual = auth.slice("basic ".length).trim();

    const expectedBuf = Buffer.from(expected, "utf8");
    const actualBuf = Buffer.from(actual, "utf8");
    if (expectedBuf.length !== actualBuf.length) {
      return { ok: false, httpStatus: 401, error: "Basic auth ei täsmää." };
    }
    if (!crypto.timingSafeEqual(expectedBuf, actualBuf)) {
      return { ok: false, httpStatus: 401, error: "Basic auth ei täsmää." };
    }

    return { ok: true };
  }

  return { ok: false, httpStatus: 400, error: "Tuntematon billing-provider webhookille." };
};

