import { createHmac, timingSafeEqual } from "crypto";

export const LEGACY_AUTHTOKEN_COOKIE_NAME = "authToken";

export function isLegacyAuthTokenEnabled(env = process.env) {
  return String(env.LEGACY_AUTHTOKEN_ENABLED || "").toLowerCase() === "true";
}

export function resolveLegacyAuthTokenSecret(env = process.env) {
  return env.LEGACY_AUTHTOKEN_SECRET || env.SESSION_SECRET || "";
}

function decodeBase64Url(value) {
  return Buffer.from(value, "base64url");
}

function encodeBase64Url(value) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function signPayload(payloadB64, secret) {
  return createHmac("sha256", secret).update(payloadB64).digest("base64url");
}

function validateTokenPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return false;
  }
  if (!payload.userId) {
    return false;
  }
  if (payload.systemRole) {
    const allowed = ["superadmin", "admin", "director", "seller"];
    if (!allowed.includes(payload.systemRole)) {
      return false;
    }
  }
  if (payload.projectRoles && typeof payload.projectRoles !== "object") {
    return false;
  }
  if (!Number.isFinite(payload.exp)) {
    return false;
  }
  return true;
}

export function createLegacyAuthToken(
  payload,
  { env = process.env, secret, nowMs = Date.now(), ttlSeconds = 12 * 60 * 60 } = {}
) {
  const resolvedSecret = secret ?? resolveLegacyAuthTokenSecret(env);
  if (!resolvedSecret) {
    throw new Error("LEGACY_AUTHTOKEN_SECRET/SESSION_SECRET puuttuu.");
  }
  const iat = Math.floor(nowMs / 1000);
  const exp = iat + Number(ttlSeconds);
  const payloadB64 = encodeBase64Url(JSON.stringify({ ...payload, iat, exp }));
  const sigB64 = signPayload(payloadB64, resolvedSecret);
  return `${payloadB64}.${sigB64}`;
}

export function verifyLegacyAuthToken(
  tokenValue,
  { env = process.env, secret, nowMs = Date.now() } = {}
) {
  if (!tokenValue || typeof tokenValue !== "string") {
    return { ok: false, reason: "missing" };
  }

  const parts = tokenValue.split(".");
  if (parts.length !== 2) {
    return { ok: false, reason: "missing_signature" };
  }
  const [payloadB64, sigB64] = parts;

  const resolvedSecret = secret ?? resolveLegacyAuthTokenSecret(env);
  if (!resolvedSecret) {
    return { ok: false, reason: "missing_secret" };
  }

  let expectedSig;
  let actualSig;
  try {
    expectedSig = decodeBase64Url(signPayload(payloadB64, resolvedSecret));
    actualSig = decodeBase64Url(sigB64);
  } catch {
    return { ok: false, reason: "invalid_signature" };
  }

  if (actualSig.length !== expectedSig.length) {
    return { ok: false, reason: "invalid_signature" };
  }
  if (!timingSafeEqual(actualSig, expectedSig)) {
    return { ok: false, reason: "invalid_signature" };
  }

  let payload;
  try {
    payload = JSON.parse(decodeBase64Url(payloadB64).toString("utf8"));
  } catch {
    return { ok: false, reason: "invalid_payload" };
  }

  if (!validateTokenPayload(payload)) {
    return { ok: false, reason: "invalid_payload" };
  }

  const nowSeconds = Math.floor(nowMs / 1000);
  if (payload.exp <= nowSeconds) {
    return { ok: false, reason: "expired" };
  }

  return { ok: true, payload };
}

export function extractLegacyAuthTokenValue(req) {
  const auth = req?.headers?.authorization || "";
  const parts = String(auth).split(" ");
  if (parts.length === 2 && parts[0] === "Bearer" && parts[1]) {
    return parts[1];
  }
  if (!req?.headers?.cookie) {
    return null;
  }
  const match = req.headers.cookie.match(
    /(?:^|;\s*)authToken=([^;]+)/
  );
  if (!match) {
    return null;
  }
  return decodeURIComponent(match[1]);
}

export function buildLegacyAuthTokenCookie(token, { maxAgeSeconds } = {}) {
  const segments = [
    `${LEGACY_AUTHTOKEN_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
  ];
  if (typeof maxAgeSeconds === "number") {
    segments.push(`Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`);
  }
  return segments.join("; ");
}

export function buildLegacyAuthTokenClearCookie() {
  return [
    `${LEGACY_AUTHTOKEN_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Max-Age=0",
  ].join("; ");
}

export function legacyAuthTokenDisabled(res) {
  res.status(410).json({
    error:
      "Legacy authToken on poistettu käytöstä. Käytä ennuste_session -kirjautumista.",
  });
}

export function requireLegacyAuthToken(req, res, { env = process.env } = {}) {
  if (!isLegacyAuthTokenEnabled(env)) {
    legacyAuthTokenDisabled(res);
    return null;
  }

  const secret = resolveLegacyAuthTokenSecret(env);
  if (!secret) {
    res.status(500).json({ error: "LEGACY_AUTHTOKEN_SECRET/SESSION_SECRET puuttuu." });
    return null;
  }

  const tokenValue = extractLegacyAuthTokenValue(req);
  const verified = verifyLegacyAuthToken(tokenValue, { secret });
  if (!verified.ok) {
    res.status(401).json({ error: "Token puuttuu tai on virheellinen." });
    return null;
  }

  req.user = verified.payload;
  return verified.payload;
}

