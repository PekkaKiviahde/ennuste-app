import assert from "node:assert/strict";
import test, { after } from "node:test";

process.env.DATABASE_URL ||= "postgresql://user:pass@127.0.0.1:5432/ennuste_dummy";
process.env.SESSION_SECRET ||= "test-session-secret";

const { app } = await import("../server.js");
const { createLegacyAuthToken } = await import("../legacy-authToken.js");

const server = app.listen(0);
const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}`;

after(() => new Promise((resolve) => server.close(resolve)));

async function request(path, { method = "GET", headers = {}, body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const setCookie = response.headers.get("set-cookie");
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: response.status, json, text, setCookie };
}

test("flag off blokkaa /api/login (legacy authToken)", async () => {
  process.env.LEGACY_AUTHTOKEN_ENABLED = "false";

  const res = await request("/api/login", {
    method: "POST",
    body: { username: "demo", pin: "0000" },
  });

  assert.equal(res.status, 410);
  assert.match(res.json?.error ?? "", /Legacy authToken/i);
});

test("flag off blokkaa /api/me (middleware)", async () => {
  process.env.LEGACY_AUTHTOKEN_ENABLED = "false";

  const res = await request("/api/me");

  assert.equal(res.status, 410);
  assert.match(res.json?.error ?? "", /Legacy authToken/i);
});

test("switch-org: cookie-only (204 + Set-Cookie, ei token-bodya)", async () => {
  process.env.LEGACY_AUTHTOKEN_ENABLED = "true";

  const token = createLegacyAuthToken({
    userId: "user-a",
    organizationId: "org-a",
    systemRole: null,
    projectRoles: {}
  });

  const res = await request("/api/session/switch-org", {
    method: "POST",
    headers: {
      cookie: `authToken=${encodeURIComponent(token)}`
    },
    body: { organizationId: "org-a" }
  });

  assert.equal(res.status, 204);
  assert.equal(res.text, "");
  assert.ok(res.setCookie);
  assert.match(res.setCookie, /authToken=/);
  assert.match(res.setCookie, /HttpOnly/i);
  assert.match(res.setCookie, /SameSite=Lax/i);
  assert.match(res.setCookie, new RegExp("Path=/", "i"));
});

test("flag off blokkaa /api/session/switch-org (middleware)", async () => {
  process.env.LEGACY_AUTHTOKEN_ENABLED = "false";

  const res = await request("/api/session/switch-org", {
    method: "POST",
    body: { organizationId: "org-a" }
  });

  assert.equal(res.status, 410);
  assert.match(res.json?.error ?? "", /Legacy authToken/i);
});

test("forgeroitu authToken -> 401", async () => {
  process.env.LEGACY_AUTHTOKEN_ENABLED = "true";

  const valid = createLegacyAuthToken({ userId: "user-a" }, { ttlSeconds: 3600 });
  const [_payloadB64, sigB64] = valid.split(".");
  const forgedPayloadB64 = Buffer.from(
    JSON.stringify({ userId: "user-b", iat: 0, exp: 9999999999 }),
    "utf8"
  ).toString("base64url");
  const forged = `${forgedPayloadB64}.${sigB64}`;

  const res = await request("/api/me", {
    headers: { cookie: `authToken=${encodeURIComponent(forged)}` },
  });

  assert.equal(res.status, 401);
});

test("puuttuva allekirjoitus -> 401", async () => {
  process.env.LEGACY_AUTHTOKEN_ENABLED = "true";

  const payloadB64 = Buffer.from(
    JSON.stringify({ userId: "user-a", iat: 0, exp: 9999999999 }),
    "utf8"
  ).toString("base64url");

  const res = await request("/api/me", {
    headers: { cookie: `authToken=${encodeURIComponent(payloadB64)}` },
  });

  assert.equal(res.status, 401);
});

test("vanhentunut token -> 401", async () => {
  process.env.LEGACY_AUTHTOKEN_ENABLED = "true";

  const expired = createLegacyAuthToken(
    { userId: "user-a" },
    { nowMs: 0, ttlSeconds: -10 }
  );

  const res = await request("/api/me", {
    headers: { cookie: `authToken=${encodeURIComponent(expired)}` },
  });

  assert.equal(res.status, 401);
});
