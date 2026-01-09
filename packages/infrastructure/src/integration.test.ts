import { after, test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { Client } from "pg";
import { POST as planningPost } from "../../../apps/web/src/app/api/planning/route";
import { POST as loginPost } from "../../../apps/web/src/app/api/login/route";
import { GET as workflowStatusGet } from "../../../apps/web/src/app/api/workflow/status/route";
import { pool } from "./db";

const databaseUrl = process.env.DATABASE_URL ?? "";
const sessionSecret = process.env.SESSION_SECRET ?? "missing-session-secret";

after(async () => {
  await pool.end();
});

const sign = (payload: string) =>
  crypto.createHmac("sha256", sessionSecret).update(payload).digest("base64url");

const createSessionToken = (sessionId: string) => {
  const payload = {
    sessionId,
    exp: Date.now() + 60 * 60 * 1000
  };
  const json = JSON.stringify(payload);
  const b64 = Buffer.from(json, "utf8").toString("base64url");
  const signature = sign(b64);
  return `${b64}.${signature}`;
};

test("planning endpoint writes planning event and audit log", { skip: !databaseUrl || !sessionSecret }, async () => {
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

  const sessionResult = await client.query(
    "INSERT INTO sessions (user_id, project_id, tenant_id, expires_at) VALUES ($1::uuid, $2::uuid, $3::uuid, now() + interval '1 hour') RETURNING session_id",
    [userId, projectId, tenantId]
  );
  const sessionToken = createSessionToken(sessionResult.rows[0].session_id);

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
});

test("planning endpoint denies without permissions", { skip: !databaseUrl || !sessionSecret }, async () => {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  const suffix = crypto.randomUUID().slice(0, 8);

  const orgResult = await client.query(
    "INSERT INTO organizations (slug, name, created_by) VALUES ($1, $2, 'seed') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING organization_id",
    [`deny-org-${suffix}`, `Deny Org ${suffix}`]
  );
  const organizationId = orgResult.rows[0].organization_id;

  const tenantResult = await client.query(
    "INSERT INTO tenants (name, created_by) VALUES ('Deny Tenant', 'seed') ON CONFLICT DO NOTHING RETURNING tenant_id"
  );
  let tenantId = tenantResult.rows[0]?.tenant_id;
  if (!tenantId) {
    const fallback = await client.query("SELECT tenant_id FROM tenants ORDER BY created_at DESC LIMIT 1");
    tenantId = fallback.rows[0]?.tenant_id;
  }

  const projectResult = await client.query(
    "INSERT INTO projects (name, customer, organization_id, tenant_id, project_state) VALUES ($1, 'Test', $2::uuid, $3::uuid, 'P1_PROJECT_ACTIVE') RETURNING project_id",
    [`Deny Projekti ${suffix}`, organizationId, tenantId]
  );
  const projectId = projectResult.rows[0].project_id;

  const userResult = await client.query(
    "INSERT INTO users (username, display_name, created_by, pin_hash) VALUES ($1, $2, 'seed', crypt('1234', gen_salt('bf'))) RETURNING user_id",
    [`deny.user.${suffix}`, `Deny User ${suffix}`]
  );
  const userId = userResult.rows[0].user_id;

  const litteraResult = await client.query(
    "INSERT INTO litteras (project_id, code, title, group_code) VALUES ($1::uuid, '9100', 'Deny Littera', 9) RETURNING littera_id",
    [projectId]
  );
  const targetLitteraId = litteraResult.rows[0].littera_id;

  const sessionResult = await client.query(
    "INSERT INTO sessions (user_id, project_id, tenant_id, expires_at) VALUES ($1::uuid, $2::uuid, $3::uuid, now() + interval '1 hour') RETURNING session_id",
    [userId, projectId, tenantId]
  );
  const sessionToken = createSessionToken(sessionResult.rows[0].session_id);

  const request = new Request("http://localhost/api/planning", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: `ennuste_session=${sessionToken}`
    },
    body: JSON.stringify({
      targetLitteraId,
      status: "READY_FOR_FORECAST",
      summary: "Denied planning"
    })
  });

  const response = await planningPost(request);
  assert.equal(response.status, 403);

  await client.end();
});

test("tenant isolation blocks cross-tenant project access", { skip: !databaseUrl || !sessionSecret }, async () => {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  const suffix = crypto.randomUUID().slice(0, 8);

  const orgA = await client.query(
    "INSERT INTO organizations (slug, name, created_by) VALUES ($1, $2, 'seed') RETURNING organization_id",
    [`tenant-a-${suffix}`, `Tenant A ${suffix}`]
  );
  const orgB = await client.query(
    "INSERT INTO organizations (slug, name, created_by) VALUES ($1, $2, 'seed') RETURNING organization_id",
    [`tenant-b-${suffix}`, `Tenant B ${suffix}`]
  );

  const tenantA = await client.query(
    "INSERT INTO tenants (name, created_by) VALUES ($1, 'seed') RETURNING tenant_id",
    [`Tenant A ${suffix}`]
  );
  const tenantB = await client.query(
    "INSERT INTO tenants (name, created_by) VALUES ($1, 'seed') RETURNING tenant_id",
    [`Tenant B ${suffix}`]
  );

  const projectA = await client.query(
    "INSERT INTO projects (name, customer, organization_id, tenant_id, project_state) VALUES ($1, 'A', $2::uuid, $3::uuid, 'P1_PROJECT_ACTIVE') RETURNING project_id",
    [`Project A ${suffix}`, orgA.rows[0].organization_id, tenantA.rows[0].tenant_id]
  );
  const projectB = await client.query(
    "INSERT INTO projects (name, customer, organization_id, tenant_id, project_state) VALUES ($1, 'B', $2::uuid, $3::uuid, 'P1_PROJECT_ACTIVE') RETURNING project_id",
    [`Project B ${suffix}`, orgB.rows[0].organization_id, tenantB.rows[0].tenant_id]
  );

  const userResult = await client.query(
    "INSERT INTO users (username, display_name, created_by, pin_hash) VALUES ($1, $2, 'seed', crypt('1234', gen_salt('bf'))) RETURNING user_id",
    [`tenant.a.user.${suffix}`, `Tenant A User ${suffix}`]
  );
  const userId = userResult.rows[0].user_id;

  await client.query(
    "INSERT INTO project_role_assignments (project_id, user_id, role_code, granted_by) VALUES ($1::uuid, $2::uuid, 'PROJECT_MANAGER', 'seed')",
    [projectA.rows[0].project_id, userId]
  );

  const litteraResult = await client.query(
    "INSERT INTO litteras (project_id, code, title, group_code) VALUES ($1::uuid, '9200', 'Tenant B Littera', 9) RETURNING littera_id",
    [projectB.rows[0].project_id]
  );
  const targetLitteraId = litteraResult.rows[0].littera_id;

  const sessionResult = await client.query(
    "INSERT INTO sessions (user_id, project_id, tenant_id, expires_at) VALUES ($1::uuid, $2::uuid, $3::uuid, now() + interval '1 hour') RETURNING session_id",
    [userId, projectB.rows[0].project_id, tenantA.rows[0].tenant_id]
  );
  const sessionToken = createSessionToken(sessionResult.rows[0].session_id);

  const request = new Request("http://localhost/api/planning", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: `ennuste_session=${sessionToken}`
    },
    body: JSON.stringify({
      targetLitteraId,
      status: "READY_FOR_FORECAST",
      summary: "Cross-tenant attempt"
    })
  });

  const response = await planningPost(request);
  assert.equal(response.status, 403);

  await client.end();
});

test("login endpoint writes audit log entry", { skip: !databaseUrl || !sessionSecret }, async () => {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  const suffix = crypto.randomUUID().slice(0, 8);

  const orgResult = await client.query(
    "INSERT INTO organizations (slug, name, created_by) VALUES ($1, $2, 'seed') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING organization_id",
    [`login-org-${suffix}`, `Login Org ${suffix}`]
  );
  const organizationId = orgResult.rows[0].organization_id;

  const tenantResult = await client.query(
    "INSERT INTO tenants (name, created_by) VALUES ('Login Tenant', 'seed') ON CONFLICT DO NOTHING RETURNING tenant_id"
  );
  let tenantId = tenantResult.rows[0]?.tenant_id;
  if (!tenantId) {
    const fallback = await client.query("SELECT tenant_id FROM tenants ORDER BY created_at DESC LIMIT 1");
    tenantId = fallback.rows[0]?.tenant_id;
  }

  const projectResult = await client.query(
    "INSERT INTO projects (name, customer, organization_id, tenant_id, project_state) VALUES ($1, 'Test', $2::uuid, $3::uuid, 'P1_PROJECT_ACTIVE') RETURNING project_id",
    [`Login Projekti ${suffix}`, organizationId, tenantId]
  );
  const projectId = projectResult.rows[0].project_id;

  const userResult = await client.query(
    "INSERT INTO users (username, display_name, created_by, pin_hash) VALUES ($1, $2, 'seed', crypt('1234', gen_salt('bf'))) RETURNING user_id",
    [`login.user.${suffix}`, `Login User ${suffix}`]
  );
  const userId = userResult.rows[0].user_id;

  await client.query(
    "INSERT INTO project_role_assignments (project_id, user_id, role_code, granted_by) VALUES ($1::uuid, $2::uuid, 'PROJECT_MANAGER', 'seed')",
    [projectId, userId]
  );

  const request = new Request("http://localhost/api/login", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      username: `login.user.${suffix}`,
      pin: "1234",
      projectId
    })
  });

  const response = await loginPost(request);
  assert.equal(response.status, 200);

  const auditCheck = await client.query(
    "SELECT 1 FROM app_audit_log WHERE project_id = $1::uuid AND action = 'auth.login'",
    [projectId]
  );
  assert.equal(auditCheck.rowCount, 1);

  await client.end();
});

test("workflow status endpoint returns latest planning status", { skip: !databaseUrl || !sessionSecret }, async () => {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  const suffix = crypto.randomUUID().slice(0, 8);

  const orgResult = await client.query(
    "INSERT INTO organizations (slug, name, created_by) VALUES ($1, $2, 'seed') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING organization_id",
    [`workflow-org-${suffix}`, `Workflow Org ${suffix}`]
  );
  const organizationId = orgResult.rows[0].organization_id;

  const tenantResult = await client.query(
    "INSERT INTO tenants (name, created_by) VALUES ('Workflow Tenant', 'seed') ON CONFLICT DO NOTHING RETURNING tenant_id"
  );
  let tenantId = tenantResult.rows[0]?.tenant_id;
  if (!tenantId) {
    const fallback = await client.query("SELECT tenant_id FROM tenants ORDER BY created_at DESC LIMIT 1");
    tenantId = fallback.rows[0]?.tenant_id;
  }

  const projectResult = await client.query(
    "INSERT INTO projects (name, customer, organization_id, tenant_id, project_state) VALUES ($1, 'Test', $2::uuid, $3::uuid, 'P1_PROJECT_ACTIVE') RETURNING project_id",
    [`Workflow Projekti ${suffix}`, organizationId, tenantId]
  );
  const projectId = projectResult.rows[0].project_id;

  const userResult = await client.query(
    "INSERT INTO users (username, display_name, created_by, pin_hash) VALUES ($1, $2, 'seed', crypt('1234', gen_salt('bf'))) RETURNING user_id",
    [`workflow.user.${suffix}`, `Workflow User ${suffix}`]
  );
  const userId = userResult.rows[0].user_id;

  await client.query(
    "INSERT INTO project_role_assignments (project_id, user_id, role_code, granted_by) VALUES ($1::uuid, $2::uuid, 'PROJECT_MANAGER', 'seed')",
    [projectId, userId]
  );

  const litteraResult = await client.query(
    "INSERT INTO litteras (project_id, code, title, group_code) VALUES ($1::uuid, '9300', 'Workflow Littera', 9) RETURNING littera_id",
    [projectId]
  );
  const targetLitteraId = litteraResult.rows[0].littera_id;

  const sessionResult = await client.query(
    "INSERT INTO sessions (user_id, project_id, tenant_id, expires_at) VALUES ($1::uuid, $2::uuid, $3::uuid, now() + interval '1 hour') RETURNING session_id",
    [userId, projectId, tenantId]
  );
  const sessionToken = createSessionToken(sessionResult.rows[0].session_id);

  const planningRequest = new Request("http://localhost/api/planning", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: `ennuste_session=${sessionToken}`
    },
    body: JSON.stringify({
      targetLitteraId,
      status: "READY_FOR_FORECAST",
      summary: "Workflow planning"
    })
  });

  const planningResponse = await planningPost(planningRequest);
  assert.equal(planningResponse.status, 201);

  const workflowRequest = new Request("http://localhost/api/workflow/status", {
    method: "GET",
    headers: {
      cookie: `ennuste_session=${sessionToken}`
    }
  });
  const response = await workflowStatusGet(workflowRequest);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.status.planning?.current?.status, "READY_FOR_FORECAST");
  assert.equal(body.status.planning?.current?.target_littera_id, targetLitteraId);
  assert.equal(body.status.planning?.current?.isLocked, false);
  assert.equal(body.status.planning?.targets?.[targetLitteraId]?.isLocked, false);
  assert.ok(body.status.audit?.action);

  await client.end();
});
