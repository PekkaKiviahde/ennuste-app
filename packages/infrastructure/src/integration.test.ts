import { after, test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { Client } from "pg";
import { POST as planningPost } from "../../../apps/web/src/app/api/planning/route";
import { POST as loginPost } from "../../../apps/web/src/app/api/login/route";
import { POST as procPackagesPost } from "../../../apps/web/src/app/api/proc-packages/route";
import { GET as projectGet } from "../../../apps/web/src/app/api/projects/[projectId]/route";
import { POST as targetEstimateMappingPost } from "../../../apps/web/src/app/api/target-estimate-mapping/route";
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

const createProjectSessionFixture = async (
  client: Client,
  suffix: string,
  scopeTag: string
): Promise<{ projectId: string; tenantId: string; sessionToken: string }> => {
  const orgResult = await client.query(
    "INSERT INTO organizations (slug, name, created_by) VALUES ($1, $2, 'seed') RETURNING organization_id",
    [`${scopeTag}-org-${suffix}`, `${scopeTag} Org ${suffix}`]
  );
  const organizationId = orgResult.rows[0].organization_id as string;

  const tenantResult = await client.query(
    "INSERT INTO tenants (name, created_by) VALUES ($1, 'seed') RETURNING tenant_id",
    [`${scopeTag} Tenant ${suffix}`]
  );
  const tenantId = tenantResult.rows[0].tenant_id as string;

  const projectResult = await client.query(
    "INSERT INTO projects (name, customer, organization_id, tenant_id, project_state) VALUES ($1, 'Test', $2::uuid, $3::uuid, 'P1_PROJECT_ACTIVE') RETURNING project_id",
    [`${scopeTag} Projekti ${suffix}`, organizationId, tenantId]
  );
  const projectId = projectResult.rows[0].project_id as string;

  const userResult = await client.query(
    "INSERT INTO users (username, display_name, created_by, pin_hash) VALUES ($1, $2, 'seed', crypt('1234', gen_salt('bf'))) RETURNING user_id",
    [`${scopeTag}.user.${suffix}`, `${scopeTag} User ${suffix}`]
  );
  const userId = userResult.rows[0].user_id as string;

  await client.query(
    "INSERT INTO organization_memberships (organization_id, user_id, joined_by) VALUES ($1::uuid, $2::uuid, 'seed')",
    [organizationId, userId]
  );

  await client.query(
    "INSERT INTO project_role_assignments (project_id, user_id, role_code, granted_by) VALUES ($1::uuid, $2::uuid, 'PROJECT_MANAGER', 'seed')",
    [projectId, userId]
  );

  const sessionResult = await client.query(
    "INSERT INTO sessions (user_id, project_id, tenant_id, expires_at) VALUES ($1::uuid, $2::uuid, $3::uuid, now() + interval '1 hour') RETURNING session_id",
    [userId, projectId, tenantId]
  );
  const sessionToken = createSessionToken(sessionResult.rows[0].session_id as string);

  return { projectId, tenantId, sessionToken };
};

const seedTargetEstimateItemWithActiveVersion = async (
  client: Client,
  projectId: string,
  suffix: string
): Promise<{ targetEstimateItemId: string }> => {
  const batchResult = await client.query(
    `INSERT INTO import_batches (
      project_id,
      kind,
      source_system,
      file_name,
      file_hash,
      created_by
    )
    VALUES ($1::uuid, 'TARGET_ESTIMATE', 'SEED', 'seed.csv', $2, 'seed')
    RETURNING id`,
    [projectId, crypto.createHash("sha256").update(`seed-${suffix}`).digest("hex")]
  );
  const importBatchId = batchResult.rows[0].id as string;

  const itemResult = await client.query(
    `INSERT INTO target_estimate_items (
      import_batch_id,
      item_code,
      littera_code,
      description,
      sum_eur,
      row_type
    )
    VALUES ($1::uuid, '9301001', '9301', 'Seed Item', 1500, 'LEAF')
    RETURNING id`,
    [importBatchId]
  );
  const targetEstimateItemId = itemResult.rows[0].id as string;

  await client.query(
    `INSERT INTO item_mapping_versions (
      project_id,
      import_batch_id,
      status,
      created_by,
      activated_at
    )
    VALUES ($1::uuid, $2::uuid, 'ACTIVE', 'seed', now())`,
    [projectId, importBatchId]
  );

  return { targetEstimateItemId };
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
    "INSERT INTO organization_memberships (organization_id, user_id, joined_by) VALUES ($1::uuid, $2::uuid, 'seed')",
    [organizationId, userId]
  );

  await client.query(
    "INSERT INTO project_role_assignments (project_id, user_id, role_code, granted_by) VALUES ($1::uuid, $2::uuid, 'PROJECT_MANAGER', 'seed')",
    [projectId, userId]
  );

  const litteraResult = await client.query(
    "INSERT INTO litteras (project_id, code, title) VALUES ($1::uuid, '9000', 'Test Littera') RETURNING littera_id",
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

  await client.query(
    "INSERT INTO organization_memberships (organization_id, user_id, joined_by) VALUES ($1::uuid, $2::uuid, 'seed')",
    [organizationId, userId]
  );

  const litteraResult = await client.query(
    "INSERT INTO litteras (project_id, code, title) VALUES ($1::uuid, '9100', 'Deny Littera') RETURNING littera_id",
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

test("tenant isolation blocks cross-tenant project read", { skip: !databaseUrl || !sessionSecret }, async () => {
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
    "INSERT INTO organization_memberships (organization_id, user_id, joined_by) VALUES ($1::uuid, $2::uuid, 'seed')",
    [orgA.rows[0].organization_id, userId]
  );

  await client.query(
    "INSERT INTO project_role_assignments (project_id, user_id, role_code, granted_by) VALUES ($1::uuid, $2::uuid, 'PROJECT_MANAGER', 'seed')",
    [projectA.rows[0].project_id, userId]
  );

  const sessionResult = await client.query(
    "INSERT INTO sessions (user_id, project_id, tenant_id, expires_at) VALUES ($1::uuid, $2::uuid, $3::uuid, now() + interval '1 hour') RETURNING session_id",
    [userId, projectA.rows[0].project_id, tenantA.rows[0].tenant_id]
  );
  const sessionToken = createSessionToken(sessionResult.rows[0].session_id);

  const request = new Request(`http://localhost/api/projects/${projectB.rows[0].project_id}`, {
    method: "GET",
    headers: {
      cookie: `ennuste_session=${sessionToken}`
    }
  });

  const response = await projectGet(request, { params: { projectId: projectB.rows[0].project_id } });
  assert.equal(response.status, 403);

  await client.end();
});

test("item mappings keep append-only rows and view shows latest", { skip: !databaseUrl }, async () => {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  const suffix = crypto.randomUUID().slice(0, 8);

  const orgResult = await client.query(
    "INSERT INTO organizations (slug, name, created_by) VALUES ($1, $2, 'seed') RETURNING organization_id",
    [`mapping-org-${suffix}`, `Mapping Org ${suffix}`]
  );
  const organizationId = orgResult.rows[0].organization_id;

  const tenantResult = await client.query(
    "INSERT INTO tenants (name, created_by) VALUES ($1, 'seed') RETURNING tenant_id",
    [`Mapping Tenant ${suffix}`]
  );
  const tenantId = tenantResult.rows[0].tenant_id;

  const projectResult = await client.query(
    "INSERT INTO projects (name, customer, organization_id, tenant_id, project_state) VALUES ($1, 'Test', $2::uuid, $3::uuid, 'P1_PROJECT_ACTIVE') RETURNING project_id",
    [`Mapping Projekti ${suffix}`, organizationId, tenantId]
  );
  const projectId = projectResult.rows[0].project_id;

  const batchResult = await client.query(
    `INSERT INTO import_batches (
      project_id,
      kind,
      source_system,
      file_name,
      file_hash,
      created_by
    )
    VALUES ($1::uuid, 'TARGET_ESTIMATE', 'SEED', 'seed.csv', $2, 'seed')
    RETURNING id`,
    [projectId, crypto.createHash("sha256").update(`seed-${suffix}`).digest("hex")]
  );
  const importBatchId = batchResult.rows[0].id;

  const itemResult = await client.query(
    `INSERT INTO target_estimate_items (
      import_batch_id,
      item_code,
      littera_code,
      description,
      sum_eur,
      row_type
    )
    VALUES ($1::uuid, '9001001', '9001', 'Test Item', 1000, 'LEAF')
    RETURNING id`,
    [importBatchId]
  );
  const targetEstimateItemId = itemResult.rows[0].id;

  const workPackageResult = await client.query(
    "INSERT INTO work_packages (project_id, code, name, status) VALUES ($1::uuid, '9001', $2, 'ACTIVE') RETURNING id",
    [projectId, `Paketti ${suffix}`]
  );
  const workPackageId = workPackageResult.rows[0].id;

  const procPackageResult = await client.query(
    "INSERT INTO proc_packages (project_id, code, name, owner_type, default_work_package_id, status) VALUES ($1::uuid, '9001', $2, 'VENDOR', $3::uuid, 'ACTIVE') RETURNING id",
    [projectId, `Proc ${suffix}`, workPackageId]
  );
  const procPackageId = procPackageResult.rows[0].id;

  const mappingVersionResult = await client.query(
    `INSERT INTO item_mapping_versions (
      project_id,
      import_batch_id,
      status,
      created_by,
      activated_at
    )
    VALUES ($1::uuid, $2::uuid, 'ACTIVE', 'seed', now())
    RETURNING id`,
    [projectId, importBatchId]
  );
  const mappingVersionId = mappingVersionResult.rows[0].id;

  await client.query(
    `INSERT INTO item_row_mappings (
      item_mapping_version_id,
      target_estimate_item_id,
      work_package_id,
      created_by,
      created_at
    )
    VALUES ($1::uuid, $2::uuid, $3::uuid, 'seed', now() - interval '2 minutes')`,
    [mappingVersionId, targetEstimateItemId, workPackageId]
  );

  await client.query(
    `INSERT INTO item_row_mappings (
      item_mapping_version_id,
      target_estimate_item_id,
      work_package_id,
      proc_package_id,
      created_by,
      created_at
    )
    VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, 'seed', now())`,
    [mappingVersionId, targetEstimateItemId, workPackageId, procPackageId]
  );

  const rowCountResult = await client.query(
    "SELECT count(*)::int AS count FROM item_row_mappings WHERE target_estimate_item_id = $1::uuid",
    [targetEstimateItemId]
  );
  assert.equal(rowCountResult.rows[0].count, 2);

  const currentResult = await client.query(
    "SELECT work_package_id, proc_package_id FROM v_current_item_mappings WHERE target_estimate_item_id = $1::uuid",
    [targetEstimateItemId]
  );
  assert.equal(currentResult.rowCount, 1);
  assert.equal(currentResult.rows[0].work_package_id, workPackageId);
  assert.equal(currentResult.rows[0].proc_package_id, procPackageId);

  await client.end();
});

test("proc package create requires default work package id", { skip: !databaseUrl || !sessionSecret }, async () => {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  const suffix = crypto.randomUUID().slice(0, 8);
  const { sessionToken } = await createProjectSessionFixture(client, suffix, "proc-required");

  const request = new Request("http://localhost/api/proc-packages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: `ennuste_session=${sessionToken}`
    },
    body: JSON.stringify({
      code: "9200",
      name: "Proc without default"
    })
  });

  const response = await procPackagesPost(request);
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.match(String(body.error ?? ""), /defaultWorkPackageId/i);

  await client.end();
});

test("work package allows only one proc package (1:1)", { skip: !databaseUrl || !sessionSecret }, async () => {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  const suffix = crypto.randomUUID().slice(0, 8);
  const { projectId, sessionToken } = await createProjectSessionFixture(client, suffix, "work-proc-1to1");

  const workPackageResult = await client.query(
    "INSERT INTO work_packages (project_id, code, name, status) VALUES ($1::uuid, '9206', $2, 'ACTIVE') RETURNING id",
    [projectId, `OneToOne WP ${suffix}`]
  );
  const workPackageId = workPackageResult.rows[0].id as string;

  const createRequestA = new Request("http://localhost/api/proc-packages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: `ennuste_session=${sessionToken}`
    },
    body: JSON.stringify({
      code: "9207",
      name: `OneToOne Proc A ${suffix}`,
      defaultWorkPackageId: workPackageId
    })
  });
  const createResponseA = await procPackagesPost(createRequestA);
  assert.equal(createResponseA.status, 201);

  const createRequestB = new Request("http://localhost/api/proc-packages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: `ennuste_session=${sessionToken}`
    },
    body: JSON.stringify({
      code: "9208",
      name: `OneToOne Proc B ${suffix}`,
      defaultWorkPackageId: workPackageId
    })
  });
  const createResponseB = await procPackagesPost(createRequestB);
  assert.equal(createResponseB.status, 409);
  const body = await createResponseB.json();
  assert.equal(body.code, "WORK_PACKAGE_ALREADY_LINKED");

  await client.end();
});

test("target-estimate mapping autofills work package from proc package default", { skip: !databaseUrl || !sessionSecret }, async () => {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  const suffix = crypto.randomUUID().slice(0, 8);
  const { projectId, sessionToken } = await createProjectSessionFixture(client, suffix, "mapping-autofill");
  const { targetEstimateItemId } = await seedTargetEstimateItemWithActiveVersion(client, projectId, suffix);

  const workPackageResult = await client.query(
    "INSERT INTO work_packages (project_id, code, name, status) VALUES ($1::uuid, '9201', $2, 'ACTIVE') RETURNING id",
    [projectId, `Autofill WP ${suffix}`]
  );
  const workPackageId = workPackageResult.rows[0].id as string;

  const procPackageResult = await client.query(
    "INSERT INTO proc_packages (project_id, code, name, owner_type, default_work_package_id, status) VALUES ($1::uuid, '9202', $2, 'VENDOR', $3::uuid, 'ACTIVE') RETURNING id",
    [projectId, `Autofill Proc ${suffix}`, workPackageId]
  );
  const procPackageId = procPackageResult.rows[0].id as string;

  const request = new Request("http://localhost/api/target-estimate-mapping", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: `ennuste_session=${sessionToken}`
    },
    body: JSON.stringify({
      itemIds: [targetEstimateItemId],
      procPackageId
    })
  });

  const response = await targetEstimateMappingPost(request);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.updatedCount, 1);

  const mappingResult = await client.query(
    "SELECT work_package_id, proc_package_id FROM v_current_item_mappings WHERE target_estimate_item_id = $1::uuid",
    [targetEstimateItemId]
  );
  assert.equal(mappingResult.rowCount, 1);
  assert.equal(mappingResult.rows[0].work_package_id, workPackageId);
  assert.equal(mappingResult.rows[0].proc_package_id, procPackageId);

  await client.end();
});

test("target-estimate mapping rejects mismatched work/proc pair", { skip: !databaseUrl || !sessionSecret }, async () => {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  const suffix = crypto.randomUUID().slice(0, 8);
  const { projectId, sessionToken } = await createProjectSessionFixture(client, suffix, "mapping-mismatch");
  const { targetEstimateItemId } = await seedTargetEstimateItemWithActiveVersion(client, projectId, suffix);

  const workPackageAResult = await client.query(
    "INSERT INTO work_packages (project_id, code, name, status) VALUES ($1::uuid, '9203', $2, 'ACTIVE') RETURNING id",
    [projectId, `Mismatch WP A ${suffix}`]
  );
  const workPackageAId = workPackageAResult.rows[0].id as string;

  const workPackageBResult = await client.query(
    "INSERT INTO work_packages (project_id, code, name, status) VALUES ($1::uuid, '9204', $2, 'ACTIVE') RETURNING id",
    [projectId, `Mismatch WP B ${suffix}`]
  );
  const workPackageBId = workPackageBResult.rows[0].id as string;

  const procPackageResult = await client.query(
    "INSERT INTO proc_packages (project_id, code, name, owner_type, default_work_package_id, status) VALUES ($1::uuid, '9205', $2, 'VENDOR', $3::uuid, 'ACTIVE') RETURNING id",
    [projectId, `Mismatch Proc ${suffix}`, workPackageAId]
  );
  const procPackageId = procPackageResult.rows[0].id as string;

  const request = new Request("http://localhost/api/target-estimate-mapping", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: `ennuste_session=${sessionToken}`
    },
    body: JSON.stringify({
      itemIds: [targetEstimateItemId],
      workPackageId: workPackageBId,
      procPackageId
    })
  });

  const response = await targetEstimateMappingPost(request);
  assert.equal(response.status, 409);
  const body = await response.json();
  assert.equal(body.code, "WORK_PROC_LINK_MISMATCH");

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
    "INSERT INTO organization_memberships (organization_id, user_id, joined_by) VALUES ($1::uuid, $2::uuid, 'seed')",
    [organizationId, userId]
  );

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
    "INSERT INTO organization_memberships (organization_id, user_id, joined_by) VALUES ($1::uuid, $2::uuid, 'seed')",
    [organizationId, userId]
  );

  await client.query(
    "INSERT INTO project_role_assignments (project_id, user_id, role_code, granted_by) VALUES ($1::uuid, $2::uuid, 'PROJECT_MANAGER', 'seed')",
    [projectId, userId]
  );

  const litteraResult = await client.query(
    "INSERT INTO litteras (project_id, code, title) VALUES ($1::uuid, '9300', 'Workflow Littera') RETURNING littera_id",
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
  assert.equal(body.status.planning?.status, "READY_FOR_FORECAST");
  assert.equal(body.status.planning?.target_littera_id, targetLitteraId);
  assert.equal(body.status.isLocked, false);
  assert.ok(body.status.audit?.action);

  await client.end();
});
