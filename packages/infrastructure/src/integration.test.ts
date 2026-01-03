import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { Client } from "pg";
import { POST as planningPost } from "../../../apps/web/src/app/api/planning/route";
import { pool } from "./db";

const databaseUrl = process.env.DATABASE_URL;
const sessionSecret = process.env.SESSION_SECRET;

if (!databaseUrl || !sessionSecret) {
  throw new Error("DATABASE_URL and SESSION_SECRET are required for integration test");
}

const sign = (payload: string) =>
  crypto.createHmac("sha256", sessionSecret).update(payload).digest("base64url");

const createSessionToken = (session: object) => {
  const payload = {
    session,
    exp: Date.now() + 60 * 60 * 1000
  };
  const json = JSON.stringify(payload);
  const b64 = Buffer.from(json, "utf8").toString("base64url");
  const signature = sign(b64);
  return `${b64}.${signature}`;
};

test("planning endpoint writes planning event and audit log", async () => {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  const suffix = crypto.randomUUID().slice(0, 8);

  const orgResult = await client.query(
    "INSERT INTO organizations (slug, name, created_by) VALUES ($1, $2, 'seed') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING organization_id",
    [`test-org-${suffix}`, `Test Org ${suffix}`]
  );
  const organizationId = orgResult.rows[0].organization_id;

  const tenantResult = await client.query(
    "INSERT INTO tenants (name, created_by) VALUES ('Test Tenant', 'seed') ON CONFLICT DO NOTHING RETURNING tenant_id"
  );
  let tenantId = tenantResult.rows[0]?.tenant_id;
  if (!tenantId) {
    const fallback = await client.query("SELECT tenant_id FROM tenants ORDER BY created_at DESC LIMIT 1");
    tenantId = fallback.rows[0]?.tenant_id;
  }

  const projectResult = await client.query(
    "INSERT INTO projects (name, customer, organization_id, tenant_id, project_state) VALUES ($1, 'Test', $2::uuid, $3::uuid, 'P1_PROJECT_ACTIVE') RETURNING project_id",
    [`Test Projekti ${suffix}`, organizationId, tenantId]
  );
  const projectId = projectResult.rows[0].project_id;

  const userResult = await client.query(
    "INSERT INTO users (username, display_name, created_by, pin_hash) VALUES ($1, $2, 'seed', crypt('1234', gen_salt('bf'))) RETURNING user_id",
    [`integration.user.${suffix}`, `Integration User ${suffix}`]
  );
  const userId = userResult.rows[0].user_id;

  await client.query(
    "INSERT INTO project_role_assignments (project_id, user_id, role_code, granted_by) VALUES ($1::uuid, $2::uuid, 'PROJECT_MANAGER', 'seed')",
    [projectId, userId]
  );

  const litteraResult = await client.query(
    "INSERT INTO litteras (project_id, code, title, group_code) VALUES ($1::uuid, '9000', 'Test Littera', 9) RETURNING littera_id",
    [projectId]
  );
  const targetLitteraId = litteraResult.rows[0].littera_id;

  const sessionToken = createSessionToken({
    userId,
    username: `integration.user.${suffix}`,
    displayName: `Integration User ${suffix}`,
    organizationId,
    projectId,
    permissions: ["REPORT_READ"]
  });

  const request = new Request("http://localhost/api/planning", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: `ennuste_session=${sessionToken}`
    },
    body: JSON.stringify({
      targetLitteraId,
      status: "READY_FOR_FORECAST",
      summary: "Test planning"
    })
  });

  const response = await planningPost(request);
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.ok(body.planningEventId);

  const planningCheck = await client.query(
    "SELECT 1 FROM planning_events WHERE planning_event_id = $1::uuid",
    [body.planningEventId]
  );
  assert.equal(planningCheck.rowCount, 1);

  const auditCheck = await client.query(
    "SELECT 1 FROM app_audit_log WHERE project_id = $1::uuid AND action = 'planning.create'",
    [projectId]
  );
  assert.equal(auditCheck.rowCount, 1);

  await client.end();
  await pool.end();
});
