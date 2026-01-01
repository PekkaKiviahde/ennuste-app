import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import { createHash, randomBytes } from "crypto";
import dotenv from "dotenv";
import { query, withClient } from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const app = express();
const port = Number(process.env.APP_PORT || process.env.PORT || 3000);

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/api", (req, res, next) => {
  if (!requireAuth(req, res)) {
    return;
  }
  next();
});

function badRequest(res, message) {
  return res.status(400).json({ error: message });
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function groupCodeFromLittera(code) {
  const s = String(code || "").trim();
  if (!s || s[0] < "0" || s[0] > "9") {
    return null;
  }
  return Number(s[0]);
}

const SYSTEM_ROLES = ["superadmin", "admin", "director", "seller"];
const PROJECT_ROLES = ["viewer", "editor", "manager", "owner"];
const PROJECT_ROLE_RANK = {
  viewer: 1,
  editor: 2,
  manager: 3,
  owner: 4,
};

function parseToken(req) {
  const auth = req.header("authorization") || "";
  const parts = auth.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return null;
  }
  try {
    const raw = Buffer.from(parts[1], "base64").toString("utf8");
    const token = JSON.parse(raw);
    if (!token.userId) {
      return null;
    }
    if (token.systemRole && !SYSTEM_ROLES.includes(token.systemRole)) {
      return null;
    }
    if (token.projectRoles && typeof token.projectRoles !== "object") {
      return null;
    }
    return token;
  } catch (err) {
    return null;
  }
}

function requireAuth(req, res) {
  const token = parseToken(req);
  if (!token) {
    res.status(401).json({ error: "Token puuttuu tai on virheellinen." });
    return null;
  }
  req.user = token;
  return token;
}

function hasProjectRole(user, projectId, minRole) {
  if (user.systemRole === "superadmin" || user.systemRole === "admin") {
    return true;
  }
  if (user.systemRole === "director" && minRole === "viewer") {
    return true;
  }
  const role = user.projectRoles?.[projectId];
  if (!role || !PROJECT_ROLES.includes(role)) {
    return false;
  }
  return PROJECT_ROLE_RANK[role] >= PROJECT_ROLE_RANK[minRole];
}

function requireProjectAccess(req, res, projectId, minRole) {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Token puuttuu tai on virheellinen." });
    return false;
  }
  if (!projectId) {
    res.status(400).json({ error: "projectId puuttuu." });
    return false;
  }
  if (!hasProjectRole(user, projectId, minRole)) {
    res.status(403).json({ error: "Ei oikeuksia tähän toimintoon." });
    return false;
  }
  return true;
}

function requireSystemRole(req, res, allowedRoles) {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Token puuttuu tai on virheellinen." });
    return false;
  }
  if (!allowedRoles.includes(user.systemRole)) {
    res.status(403).json({ error: "Ei oikeuksia tähän toimintoon." });
    return false;
  }
  return true;
}

async function logMappingEvent({ projectId, actor, action, payload }) {
  await query(
    "INSERT INTO mapping_event_log (project_id, actor, action, payload) VALUES ($1,$2,$3,$4)",
    [projectId, actor, action, payload || {}]
  );
}

async function logMappingEventWithClient(client, { projectId, actor, action, payload }) {
  await client.query(
    "INSERT INTO mapping_event_log (project_id, actor, action, payload) VALUES ($1,$2,$3,$4)",
    [projectId, actor, action, payload || {}]
  );
}

const execFileAsync = promisify(execFile);

function trimLog(text, limit = 8000) {
  if (!text) {
    return "";
  }
  const cleaned = String(text).trim();
  if (cleaned.length <= limit) {
    return cleaned;
  }
  return `${cleaned.slice(0, limit)}…(truncated)`;
}

function extractImportBatchId(text) {
  const cleaned = String(text || "");
  const match = cleaned.match(/import_batch_id=([0-9a-f-]+)/i);
  if (match) {
    return match[1];
  }
  const alt = cleaned.match(/Import batch:\s*([0-9a-f-]+)/i);
  return alt ? alt[1] : null;
}

async function runBudgetImport({ projectId, importedBy, filePath, dryRun }) {
  const scriptPath = path.join(__dirname, "..", "tools", "scripts", "import_budget.py");
  const pythonBin = process.env.PYTHON || "python";
  const args = [
    scriptPath,
    "--project-id",
    projectId,
    "--file",
    filePath,
    "--imported-by",
    importedBy,
  ];
  if (dryRun) {
    args.push("--dry-run");
  }
  return execFileAsync(pythonBin, args, {
    env: process.env,
    maxBuffer: 10 * 1024 * 1024,
  });
}

async function runJydaImport({
  projectId,
  importedBy,
  filePath,
  dryRun,
  occurredOn,
  metrics,
  includeZeros,
}) {
  const scriptPath = path.join(__dirname, "..", "tools", "scripts", "import_jyda.py");
  const pythonBin = process.env.PYTHON || "python";
  const args = ["--file", filePath, "--project-id", projectId, "--imported-by", importedBy];
  if (occurredOn) {
    args.push("--occurred-on", occurredOn);
  }
  if (Array.isArray(metrics) && metrics.length > 0) {
    args.push("--metrics", ...metrics);
  }
  if (includeZeros) {
    args.push("--include-zeros");
  }
  if (dryRun) {
    args.push("--dry-run");
  }
  return execFileAsync(pythonBin, [scriptPath, ...args], {
    env: process.env,
    maxBuffer: 10 * 1024 * 1024,
  });
}

function decodeFileData(fileData) {
  if (!fileData) {
    return null;
  }
  const text = String(fileData);
  const commaIdx = text.indexOf(",");
  const base64 = commaIdx >= 0 ? text.slice(commaIdx + 1) : text;
  return Buffer.from(base64, "base64");
}

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

async function getOrCreateMonth(client, projectId, month) {
  const { rows } = await client.query(
    "SELECT month_state FROM months WHERE project_id=$1 AND month=$2",
    [projectId, month]
  );
  if (rows.length > 0) {
    return rows[0].month_state;
  }
  await client.query(
    "INSERT INTO months (project_id, month, month_state) VALUES ($1,$2,'M0_OPEN_DRAFT')",
    [projectId, month]
  );
  return "M0_OPEN_DRAFT";
}

async function setMonthState(client, { projectId, month, fromState, toState, actor, reason }) {
  await client.query(
    `UPDATE months
     SET month_state=$3::month_state,
         lock_applied_at=CASE WHEN $3::month_state='M2_SENT_LOCKED'::month_state THEN now() ELSE lock_applied_at END,
         updated_at=now()
     WHERE project_id=$1 AND month=$2`,
    [projectId, month, toState]
  );
  await client.query(
    `INSERT INTO month_state_events (project_id, month, from_state, to_state, actor_user_id, reason)
     VALUES ($1,$2,$3::month_state,$4::month_state,$5,$6)`,
    [projectId, month, fromState, toState, actor || null, reason || null]
  );
}

async function logImportJobEvent({ jobId, status, message }) {
  await query(
    "INSERT INTO import_job_events (import_job_id, status, message) VALUES ($1,$2,$3)",
    [jobId, status, message || null]
  );
}

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/tenants", async (_req, res, next) => {
  try {
    const user = _req.user;
    if (!user || !["admin", "superadmin", "director", "seller"].includes(user.systemRole)) {
      return res.status(403).json({ error: "Ei oikeuksia tähän toimintoon." });
    }
    const { rows } = await query(
      "SELECT tenant_id, name, onboarding_state, created_at FROM tenants ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

app.get("/api/tenants/:tenantId/projects", async (req, res, next) => {
  try {
    if (!requireSystemRole(req, res, ["superadmin", "admin", "director", "seller"])) {
      return;
    }
    const { tenantId } = req.params;
    const { rows } = await query(
      "SELECT project_id, name, customer, project_state, created_at FROM projects WHERE tenant_id=$1 ORDER BY created_at DESC",
      [tenantId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

app.get("/api/projects", async (_req, res, next) => {
  try {
    const user = _req.user;
    if (
      user.systemRole === "superadmin" ||
      user.systemRole === "admin" ||
      user.systemRole === "director"
    ) {
      const { rows } = await query(
        "SELECT project_id, name, customer, created_at FROM projects ORDER BY created_at DESC"
      );
      res.json(rows);
      return;
    }

    const projectIds = Object.keys(user.projectRoles || {});
    if (projectIds.length === 0) {
      res.json([]);
      return;
    }

    const { rows } = await query(
      "SELECT project_id, name, customer, created_at FROM projects WHERE project_id = ANY($1) ORDER BY created_at DESC",
      [projectIds]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

app.post("/api/projects", async (req, res, next) => {
  try {
    if (!requireSystemRole(req, res, ["superadmin", "admin"])) {
      return;
    }
    const { name, customer } = req.body;
    if (!name || String(name).trim() === "") {
      return badRequest(res, "Nimi puuttuu.");
    }
    const { rows } = await query(
      "INSERT INTO projects (name, customer) VALUES ($1, $2) RETURNING project_id",
      [String(name).trim(), customer ? String(customer).trim() : null]
    );
    res.status(201).json({ project_id: rows[0].project_id });
  } catch (err) {
    next(err);
  }
});

app.post("/api/seller/tenants", async (req, res, next) => {
  try {
    if (!requireSystemRole(req, res, ["seller", "admin", "superadmin"])) {
      return;
    }
    const { name, createdBy } = req.body;
    if (!name || String(name).trim() === "") {
      return badRequest(res, "Nimi puuttuu.");
    }
    if (!createdBy || String(createdBy).trim() === "") {
      return badRequest(res, "createdBy puuttuu.");
    }
    const { rows } = await query(
      "INSERT INTO tenants (name, created_by) VALUES ($1,$2) RETURNING tenant_id",
      [String(name).trim(), String(createdBy).trim()]
    );
    res.status(201).json({ tenant_id: rows[0].tenant_id });
  } catch (err) {
    next(err);
  }
});

app.post("/api/seller/projects", async (req, res, next) => {
  try {
    if (!requireSystemRole(req, res, ["seller", "admin", "superadmin"])) {
      return;
    }
    const { tenantId, name, customer, createdBy } = req.body;
    if (!tenantId) {
      return badRequest(res, "tenantId puuttuu.");
    }
    if (!name || String(name).trim() === "") {
      return badRequest(res, "Nimi puuttuu.");
    }
    if (!createdBy || String(createdBy).trim() === "") {
      return badRequest(res, "createdBy puuttuu.");
    }
    const { rows } = await query(
      "INSERT INTO projects (tenant_id, name, customer) VALUES ($1,$2,$3) RETURNING project_id",
      [tenantId, String(name).trim(), customer ? String(customer).trim() : null]
    );
    await query(
      "INSERT INTO project_state_events (project_id, from_state, to_state, actor_user_id, reason) VALUES ($1,$2,$3,$4,$5)",
      [rows[0].project_id, null, "P0_PROJECT_DRAFT", String(createdBy).trim(), "Seller stub"]
    );
    res.status(201).json({ project_id: rows[0].project_id });
  } catch (err) {
    next(err);
  }
});

app.post("/api/seller/onboarding-links", async (req, res, next) => {
  try {
    if (!requireSystemRole(req, res, ["seller", "admin", "superadmin"])) {
      return;
    }
    const { tenantId, projectId, createdBy, expiresAt } = req.body;
    if (!tenantId) {
      return badRequest(res, "tenantId puuttuu.");
    }
    if (!createdBy || String(createdBy).trim() === "") {
      return badRequest(res, "createdBy puuttuu.");
    }
    const token = randomBytes(24).toString("hex");
    const tokenHash = hashToken(token);
    const expiry = expiresAt ? new Date(expiresAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const { rows: stateRows } = await query(
      "SELECT onboarding_state FROM tenants WHERE tenant_id=$1",
      [tenantId]
    );
    if (stateRows.length === 0) {
      return badRequest(res, "Tenantia ei löydy.");
    }
    const fromState = stateRows[0].onboarding_state;

    await withClient(async (client) => {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO onboarding_links
          (tenant_id, project_id, token_hash, expires_at, created_by)
         VALUES ($1,$2,$3,$4,$5)`,
        [tenantId, projectId || null, tokenHash, expiry.toISOString(), String(createdBy).trim()]
      );
      await client.query(
        "UPDATE tenants SET onboarding_state='C1_ONBOARDING_LINK_SENT' WHERE tenant_id=$1",
        [tenantId]
      );
      await client.query(
        `INSERT INTO tenant_state_events (tenant_id, from_state, to_state, actor_user_id, reason)
         VALUES ($1,$2,$3,$4,$5)`,
        [tenantId, fromState, "C1_ONBOARDING_LINK_SENT", String(createdBy).trim(), "Onboarding link sent"]
      );
      await client.query("COMMIT");
    });

    res.status(201).json({
      token,
      expires_at: expiry.toISOString(),
      onboarding_url: `/onboarding?token=${token}`,
    });
  } catch (err) {
    next(err);
  }
});

app.post("/api/admin/tenants/:tenantId/onboarding/company", async (req, res, next) => {
  try {
    if (!requireSystemRole(req, res, ["admin", "superadmin"])) {
      return;
    }
    const { tenantId } = req.params;
    const { details, updatedBy } = req.body;
    if (!details || typeof details !== "object") {
      return badRequest(res, "details puuttuu.");
    }
    if (!updatedBy || String(updatedBy).trim() === "") {
      return badRequest(res, "updatedBy puuttuu.");
    }
    const { rows: stateRows } = await query(
      "SELECT onboarding_state FROM tenants WHERE tenant_id=$1",
      [tenantId]
    );
    if (stateRows.length === 0) {
      return badRequest(res, "Tenantia ei löydy.");
    }
    const fromState = stateRows[0].onboarding_state;

    await withClient(async (client) => {
      await client.query("BEGIN");
      await client.query(
        "UPDATE tenants SET company_details=$2, onboarding_state='C2_ONBOARDING_IN_PROGRESS' WHERE tenant_id=$1",
        [tenantId, details]
      );
      await client.query(
        `INSERT INTO tenant_state_events (tenant_id, from_state, to_state, actor_user_id, reason)
         VALUES ($1,$2,$3,$4,$5)`,
        [tenantId, fromState, "C2_ONBOARDING_IN_PROGRESS", String(updatedBy).trim(), "Company details saved"]
      );
      await client.query("COMMIT");
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

app.post("/api/admin/projects/:projectId/onboarding/project", async (req, res, next) => {
  try {
    if (!requireSystemRole(req, res, ["admin", "superadmin"])) {
      return;
    }
    const { projectId } = req.params;
    const { details, updatedBy } = req.body;
    if (!details || typeof details !== "object") {
      return badRequest(res, "details puuttuu.");
    }
    if (!updatedBy || String(updatedBy).trim() === "") {
      return badRequest(res, "updatedBy puuttuu.");
    }
    await query("UPDATE projects SET project_details=$2 WHERE project_id=$1", [projectId, details]);
    await query(
      `INSERT INTO project_state_events (project_id, from_state, to_state, actor_user_id, reason)
       VALUES ($1,$2,$3,$4,$5)`,
      [projectId, null, "P0_PROJECT_DRAFT", String(updatedBy).trim(), "Project details saved"]
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

app.post("/api/admin/tenants/:tenantId/onboarding/complete", async (req, res, next) => {
  try {
    if (!requireSystemRole(req, res, ["admin", "superadmin"])) {
      return;
    }
    const { tenantId } = req.params;
    const { updatedBy } = req.body;
    if (!updatedBy || String(updatedBy).trim() === "") {
      return badRequest(res, "updatedBy puuttuu.");
    }
    const { rows: stateRows } = await query(
      "SELECT onboarding_state FROM tenants WHERE tenant_id=$1",
      [tenantId]
    );
    if (stateRows.length === 0) {
      return badRequest(res, "Tenantia ei löydy.");
    }
    const fromState = stateRows[0].onboarding_state;
    await withClient(async (client) => {
      await client.query("BEGIN");
      await client.query(
        "UPDATE tenants SET onboarding_state='C3_READY' WHERE tenant_id=$1",
        [tenantId]
      );
      await client.query(
        `INSERT INTO tenant_state_events (tenant_id, from_state, to_state, actor_user_id, reason)
         VALUES ($1,$2,$3,$4,$5)`,
        [tenantId, fromState, "C3_READY", String(updatedBy).trim(), "Onboarding completed"]
      );
      await client.query("COMMIT");
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

app.post("/api/projects/:projectId/activate", async (req, res, next) => {
  try {
    if (!requireSystemRole(req, res, ["admin", "superadmin"])) {
      return;
    }
    const { projectId } = req.params;
    const { updatedBy } = req.body;
    if (!updatedBy || String(updatedBy).trim() === "") {
      return badRequest(res, "updatedBy puuttuu.");
    }
    const { rows } = await query(
      `SELECT p.project_state, t.onboarding_state
       FROM projects p
       JOIN tenants t ON t.tenant_id = p.tenant_id
       WHERE p.project_id=$1`,
      [projectId]
    );
    if (rows.length === 0) {
      return badRequest(res, "Projektia ei löydy.");
    }
    const tenantState = rows[0].onboarding_state;
    if (!["C2_ONBOARDING_IN_PROGRESS", "C3_READY"].includes(tenantState)) {
      return badRequest(res, "Tenant onboarding ei ole valmis aktivointiin.");
    }
    const fromState = rows[0].project_state;
    await withClient(async (client) => {
      await client.query("BEGIN");
      await client.query(
        "UPDATE projects SET project_state='P1_PROJECT_ACTIVE' WHERE project_id=$1",
        [projectId]
      );
      await client.query(
        `INSERT INTO project_state_events (project_id, from_state, to_state, actor_user_id, reason)
         VALUES ($1,$2,$3,$4,$5)`,
        [projectId, fromState, "P1_PROJECT_ACTIVE", String(updatedBy).trim(), "Project activated"]
      );
      await client.query("COMMIT");
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

app.post("/api/projects/:projectId/archive", async (req, res, next) => {
  try {
    if (!requireSystemRole(req, res, ["admin", "superadmin"])) {
      return;
    }
    const { projectId } = req.params;
    const { updatedBy } = req.body;
    if (!updatedBy || String(updatedBy).trim() === "") {
      return badRequest(res, "updatedBy puuttuu.");
    }
    const { rows } = await query(
      "SELECT project_state FROM projects WHERE project_id=$1",
      [projectId]
    );
    if (rows.length === 0) {
      return badRequest(res, "Projektia ei löydy.");
    }
    const fromState = rows[0].project_state;
    await withClient(async (client) => {
      await client.query("BEGIN");
      await client.query(
        "UPDATE projects SET project_state='P2_PROJECT_ARCHIVED' WHERE project_id=$1",
        [projectId]
      );
      await client.query(
        `INSERT INTO project_state_events (project_id, from_state, to_state, actor_user_id, reason)
         VALUES ($1,$2,$3,$4,$5)`,
        [projectId, fromState, "P2_PROJECT_ARCHIVED", String(updatedBy).trim(), "Project archived"]
      );
      await client.query("COMMIT");
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

app.get("/api/projects/:projectId/litteras", async (req, res, next) => {
  try {
    if (!requireProjectAccess(req, res, req.params.projectId, "viewer")) {
      return;
    }
    const { projectId } = req.params;
    const { rows } = await query(
      "SELECT littera_id, code, title, group_code FROM litteras WHERE project_id=$1 ORDER BY code",
      [projectId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

app.get("/api/work-phases", async (req, res, next) => {
  try {
    if (!requireProjectAccess(req, res, req.query.projectId, "viewer")) {
      return;
    }
    const { projectId } = req.query;
    if (!projectId) {
      return badRequest(res, "projectId puuttuu.");
    }
    const { rows } = await query(
      `SELECT work_phase_id, name, status, owner, lead_littera_id
       FROM work_phases
       WHERE project_id=$1
       ORDER BY created_at DESC`,
      [projectId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

app.post("/api/work-phases", async (req, res, next) => {
  try {
    if (!requireProjectAccess(req, res, req.body.projectId, "editor")) {
      return;
    }
    const { projectId, name, description, owner, leadLitteraId, createdBy } = req.body;
    if (!projectId) {
      return badRequest(res, "projectId puuttuu.");
    }
    if (!name || String(name).trim() === "") {
      return badRequest(res, "name puuttuu.");
    }
    if (!createdBy || String(createdBy).trim() === "") {
      return badRequest(res, "createdBy puuttuu.");
    }
    const { rows } = await query(
      `INSERT INTO work_phases (project_id, name, description, owner, lead_littera_id, created_by)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING work_phase_id`,
      [
        projectId,
        String(name).trim(),
        description ? String(description).trim() : null,
        owner ? String(owner).trim() : null,
        leadLitteraId || null,
        String(createdBy).trim(),
      ]
    );
    res.status(201).json({ work_phase_id: rows[0].work_phase_id });
  } catch (err) {
    next(err);
  }
});

app.get("/api/work-phases/:workPhaseId/weekly-updates", async (req, res, next) => {
  try {
    if (!requireProjectAccess(req, res, req.query.projectId, "viewer")) {
      return;
    }
    const { workPhaseId } = req.params;
    const { projectId } = req.query;
    if (!projectId) {
      return badRequest(res, "projectId puuttuu.");
    }
    const { rows } = await query(
      `SELECT work_phase_weekly_update_id, week_ending, percent_complete, progress_notes, risks, created_by, created_at
       FROM work_phase_weekly_updates
       WHERE project_id=$1 AND work_phase_id=$2
       ORDER BY week_ending DESC, created_at DESC`,
      [projectId, workPhaseId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

app.post("/api/work-phases/:workPhaseId/weekly-updates", async (req, res, next) => {
  try {
    if (!requireProjectAccess(req, res, req.body.projectId, "editor")) {
      return;
    }
    const { workPhaseId } = req.params;
    const { projectId, weekEnding, percentComplete, progressNotes, risks, createdBy } = req.body;
    if (!projectId || !weekEnding) {
      return badRequest(res, "projectId ja weekEnding puuttuu.");
    }
    if (percentComplete === null || percentComplete === undefined || percentComplete === "") {
      return badRequest(res, "percentComplete puuttuu.");
    }
    if (!createdBy || String(createdBy).trim() === "") {
      return badRequest(res, "createdBy puuttuu.");
    }
    const { rows } = await query(
      `INSERT INTO work_phase_weekly_updates
        (project_id, work_phase_id, week_ending, percent_complete, progress_notes, risks, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING work_phase_weekly_update_id`,
      [
        projectId,
        workPhaseId,
        weekEnding,
        toNumber(percentComplete),
        progressNotes ? String(progressNotes).trim() : null,
        risks ? String(risks).trim() : null,
        String(createdBy).trim(),
      ]
    );
    res.status(201).json({ work_phase_weekly_update_id: rows[0].work_phase_weekly_update_id });
  } catch (err) {
    next(err);
  }
});

app.get("/api/work-phases/:workPhaseId/ghosts", async (req, res, next) => {
  try {
    if (!requireProjectAccess(req, res, req.query.projectId, "viewer")) {
      return;
    }
    const { projectId } = req.query;
    const { workPhaseId } = req.params;
    if (!projectId) {
      return badRequest(res, "projectId puuttuu.");
    }
    const { rows } = await query(
      `SELECT ghost_cost_entry_id, week_ending, cost_type, entered_amount, settled_amount, open_amount
       FROM v_ghost_open_entries
       WHERE project_id=$1 AND work_phase_id=$2
       ORDER BY week_ending DESC`,
      [projectId, workPhaseId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

app.post("/api/work-phases/:workPhaseId/ghosts", async (req, res, next) => {
  try {
    if (!requireProjectAccess(req, res, req.body.projectId, "editor")) {
      return;
    }
    const { workPhaseId } = req.params;
    const { projectId, weekEnding, costType, amount, description, createdBy } = req.body;
    if (!projectId || !weekEnding) {
      return badRequest(res, "projectId ja weekEnding puuttuu.");
    }
    if (!costType) {
      return badRequest(res, "costType puuttuu.");
    }
    if (amount === null || amount === undefined || amount === "") {
      return badRequest(res, "amount puuttuu.");
    }
    if (!createdBy || String(createdBy).trim() === "") {
      return badRequest(res, "createdBy puuttuu.");
    }
    const { rows } = await query(
      `INSERT INTO ghost_cost_entries
        (project_id, work_phase_id, week_ending, cost_type, amount, description, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING ghost_cost_entry_id`,
      [
        projectId,
        workPhaseId,
        weekEnding,
        String(costType).toUpperCase(),
        toNumber(amount),
        description ? String(description).trim() : null,
        String(createdBy).trim(),
      ]
    );
    res.status(201).json({ ghost_cost_entry_id: rows[0].ghost_cost_entry_id });
  } catch (err) {
    next(err);
  }
});

app.post("/api/ghosts/:ghostId/settlements", async (req, res, next) => {
  try {
    if (!requireProjectAccess(req, res, req.body.projectId, "manager")) {
      return;
    }
    const { ghostId } = req.params;
    const { projectId, settledAmount, settledBy, notes } = req.body;
    if (!projectId) {
      return badRequest(res, "projectId puuttuu.");
    }
    if (settledAmount === null || settledAmount === undefined || settledAmount === "") {
      return badRequest(res, "settledAmount puuttuu.");
    }
    if (!settledBy || String(settledBy).trim() === "") {
      return badRequest(res, "settledBy puuttuu.");
    }
    const { rows } = await query(
      "SELECT ghost_cost_entry_id FROM ghost_cost_entries WHERE ghost_cost_entry_id=$1 AND project_id=$2",
      [ghostId, projectId]
    );
    if (rows.length === 0) {
      return badRequest(res, "Ghost-kirjausta ei löydy.");
    }
    const { rows: insertRows } = await query(
      `INSERT INTO ghost_cost_settlements
        (ghost_cost_entry_id, settled_amount, settled_by, notes)
       VALUES ($1,$2,$3,$4)
       RETURNING ghost_cost_settlement_id`,
      [ghostId, toNumber(settledAmount), String(settledBy).trim(), notes ? String(notes).trim() : null]
    );
    res.status(201).json({ ghost_cost_settlement_id: insertRows[0].ghost_cost_settlement_id });
  } catch (err) {
    next(err);
  }
});
app.post("/api/litteras", async (req, res, next) => {
  try {
    if (!requireProjectAccess(req, res, req.body.projectId, "editor")) {
      return;
    }
    const { projectId, code, title } = req.body;
    if (!projectId) {
      return badRequest(res, "projectId puuttuu.");
    }
    if (!code || String(code).trim() === "") {
      return badRequest(res, "Litterakoodi puuttuu.");
    }
    const cleanedCode = String(code).trim();
    const groupCode = groupCodeFromLittera(cleanedCode);

    const { rows } = await query(
      "INSERT INTO litteras (project_id, code, title, group_code) VALUES ($1,$2,$3,$4) RETURNING littera_id",
      [projectId, cleanedCode, title ? String(title).trim() : null, groupCode]
    );

    res.status(201).json({ littera_id: rows[0].littera_id });
  } catch (err) {
    next(err);
  }
});

app.post("/api/budget-import", async (req, res, next) => {
  const tmpDirPrefix = path.join(os.tmpdir(), "budget-import-");
  let tmpDir = null;
  try {
    if (!requireProjectAccess(req, res, req.body.projectId, "manager")) {
      return;
    }
    const { projectId, importedBy, filename, csvText, dryRun } = req.body;
    if (!projectId) {
      return badRequest(res, "projectId puuttuu.");
    }
    if (!importedBy || String(importedBy).trim() === "") {
      return badRequest(res, "importedBy puuttuu.");
    }
    if (!csvText || String(csvText).trim() === "") {
      return badRequest(res, "CSV-teksti puuttuu.");
    }

    tmpDir = await fs.mkdtemp(tmpDirPrefix);
    const safeName = filename ? String(filename).replace(/[^\w.\-]/g, "_") : "budget.csv";
    const filePath = path.join(tmpDir, safeName);
    await fs.writeFile(filePath, String(csvText), "utf8");

    const { rows } = await query(
      `INSERT INTO import_jobs (project_id, import_type, status, created_by, source_filename)
       VALUES ($1, 'BUDGET', 'QUEUED', $2, $3)
       RETURNING import_job_id`,
      [projectId, String(importedBy).trim(), safeName]
    );
    const jobId = rows[0].import_job_id;
    await logImportJobEvent({ jobId, status: "QUEUED", message: "Tuonti jonossa." });

    res.json({ ok: true, import_job_id: jobId });

    setImmediate(async () => {
      try {
        await query(
          `UPDATE import_jobs
           SET status='RUNNING', started_at=now()
           WHERE import_job_id=$1`,
          [jobId]
        );
        await logImportJobEvent({ jobId, status: "RUNNING", message: "Tuonti käynnistetty." });

        const { stdout, stderr } = await runBudgetImport({
          projectId,
          importedBy: String(importedBy).trim(),
          filePath,
          dryRun: Boolean(dryRun),
        });
        const importBatchId = extractImportBatchId(stdout);
        await query(
          `UPDATE import_jobs
           SET status='SUCCESS', finished_at=now(), import_batch_id=$2,
               stdout=$3, stderr=$4
           WHERE import_job_id=$1`,
          [jobId, importBatchId, trimLog(stdout), trimLog(stderr)]
        );
        await logImportJobEvent({
          jobId,
          status: "SUCCESS",
          message: importBatchId ? `Valmis. import_batch_id=${importBatchId}` : "Valmis.",
        });
      } catch (err) {
        const stderr = err?.stderr || "";
        await query(
          `UPDATE import_jobs
           SET status='FAILED', finished_at=now(), error_message=$2, stdout=$3, stderr=$4
           WHERE import_job_id=$1`,
          [jobId, String(err.message || "Tuonti epäonnistui."), trimLog(err.stdout), trimLog(stderr)]
        );
        await logImportJobEvent({
          jobId,
          status: "FAILED",
          message: String(err.message || "Tuonti epäonnistui."),
        });
      } finally {
        if (tmpDir) {
          try {
            await fs.rm(tmpDir, { recursive: true, force: true });
          } catch (_) {
            // cleanup best-effort
          }
        }
      }
    });
  } catch (err) {
    if (tmpDir) {
      try {
        await fs.rm(tmpDir, { recursive: true, force: true });
      } catch (_) {
        // cleanup best-effort
      }
    }
    next(err);
  }
});

app.post("/api/jyda-import", async (req, res, next) => {
  const tmpDirPrefix = path.join(os.tmpdir(), "jyda-import-");
  let tmpDir = null;
  try {
    if (!requireProjectAccess(req, res, req.body.projectId, "manager")) {
      return;
    }
    const {
      projectId,
      importedBy,
      filename,
      csvText,
      fileData,
      dryRun,
      occurredOn,
      metrics,
      includeZeros,
    } = req.body;
    if (!projectId) {
      return badRequest(res, "projectId puuttuu.");
    }
    if (!importedBy || String(importedBy).trim() === "") {
      return badRequest(res, "importedBy puuttuu.");
    }
    if ((!csvText || String(csvText).trim() === "") && !fileData) {
      return badRequest(res, "CSV-teksti tai tiedosto puuttuu.");
    }
    if (!Array.isArray(metrics) || metrics.length === 0) {
      return badRequest(res, "metrics puuttuu.");
    }

    tmpDir = await fs.mkdtemp(tmpDirPrefix);
    const safeName = filename ? String(filename).replace(/[^\w.\-]/g, "_") : "jyda.csv";
    const filePath = path.join(tmpDir, safeName);
    if (fileData) {
      const buffer = decodeFileData(fileData);
      await fs.writeFile(filePath, buffer);
    } else {
      await fs.writeFile(filePath, String(csvText), "utf8");
    }

    const { rows } = await query(
      `INSERT INTO import_jobs (project_id, import_type, status, created_by, source_filename)
       VALUES ($1, 'JYDA', 'QUEUED', $2, $3)
       RETURNING import_job_id`,
      [projectId, String(importedBy).trim(), safeName]
    );
    const jobId = rows[0].import_job_id;
    await logImportJobEvent({ jobId, status: "QUEUED", message: "Tuonti jonossa." });

    res.json({ ok: true, import_job_id: jobId });

    setImmediate(async () => {
      try {
        await query(
          `UPDATE import_jobs
           SET status='RUNNING', started_at=now()
           WHERE import_job_id=$1`,
          [jobId]
        );
        await logImportJobEvent({ jobId, status: "RUNNING", message: "Tuonti käynnistetty." });

        const { stdout, stderr } = await runJydaImport({
          projectId,
          importedBy: String(importedBy).trim(),
          filePath,
          dryRun: Boolean(dryRun),
          occurredOn: occurredOn ? String(occurredOn).trim() : "",
          metrics,
          includeZeros: Boolean(includeZeros),
        });
        const importBatchId = extractImportBatchId(stdout);
        await query(
          `UPDATE import_jobs
           SET status='SUCCESS', finished_at=now(), import_batch_id=$2,
               stdout=$3, stderr=$4
           WHERE import_job_id=$1`,
          [jobId, importBatchId, trimLog(stdout), trimLog(stderr)]
        );
        await logImportJobEvent({
          jobId,
          status: "SUCCESS",
          message: importBatchId ? `Valmis. import_batch_id=${importBatchId}` : "Valmis.",
        });
      } catch (err) {
        const stderr = err?.stderr || "";
        await query(
          `UPDATE import_jobs
           SET status='FAILED', finished_at=now(), error_message=$2, stdout=$3, stderr=$4
           WHERE import_job_id=$1`,
          [jobId, String(err.message || "Tuonti epäonnistui."), trimLog(err.stdout), trimLog(stderr)]
        );
        await logImportJobEvent({
          jobId,
          status: "FAILED",
          message: String(err.message || "Tuonti epäonnistui."),
        });
      } finally {
        if (tmpDir) {
          try {
            await fs.rm(tmpDir, { recursive: true, force: true });
          } catch (_) {
            // cleanup best-effort
          }
        }
      }
    });
  } catch (err) {
    if (tmpDir) {
      try {
        await fs.rm(tmpDir, { recursive: true, force: true });
      } catch (_) {
        // cleanup best-effort
      }
    }
    next(err);
  }
});

app.get("/api/import-jobs", async (req, res, next) => {
  try {
    const { projectId } = req.query;
    if (!projectId) {
      return badRequest(res, "projectId puuttuu.");
    }
    if (!requireProjectAccess(req, res, projectId, "manager")) {
      return;
    }
    const { rows } = await query(
      `SELECT import_job_id, project_id, import_type, status, source_filename,
              created_by, created_at, started_at, finished_at, import_batch_id
       FROM import_jobs
       WHERE project_id=$1
       ORDER BY created_at DESC
       LIMIT 20`,
      [projectId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

app.get("/api/import-jobs/:jobId", async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const { rows } = await query(
      `SELECT import_job_id, project_id, import_type, status, source_filename,
              created_by, created_at, started_at, finished_at, import_batch_id,
              stdout, stderr, error_message
       FROM import_jobs
       WHERE import_job_id=$1`,
      [jobId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Import-ajon tunnistetta ei löydy." });
    }
    const job = rows[0];
    if (!requireProjectAccess(req, res, job.project_id, "manager")) {
      return;
    }
    const events = await query(
      `SELECT status, message, created_at
       FROM import_job_events
       WHERE import_job_id=$1
       ORDER BY created_at ASC`,
      [jobId]
    );
    res.json({ job, events: events.rows });
  } catch (err) {
    next(err);
  }
});

app.get("/api/import-mappings", async (req, res, next) => {
  try {
    const { projectId, type } = req.query;
    if (!projectId || !type) {
      return badRequest(res, "projectId ja type puuttuu.");
    }
    if (!requireProjectAccess(req, res, projectId, "manager")) {
      return;
    }
    const { rows } = await query(
      `SELECT mapping, updated_at, created_by
       FROM import_mappings
       WHERE project_id=$1 AND import_type=$2`,
      [projectId, type]
    );
    res.json(rows[0] || null);
  } catch (err) {
    next(err);
  }
});

app.put("/api/import-mappings", async (req, res, next) => {
  try {
    const { projectId, type, mapping, createdBy } = req.body;
    if (!projectId || !type) {
      return badRequest(res, "projectId ja type puuttuu.");
    }
    if (!mapping || typeof mapping !== "object") {
      return badRequest(res, "mapping puuttuu.");
    }
    if (!createdBy || String(createdBy).trim() === "") {
      return badRequest(res, "createdBy puuttuu.");
    }
    if (!requireProjectAccess(req, res, projectId, "manager")) {
      return;
    }
    const { rows } = await query(
      `INSERT INTO import_mappings (project_id, import_type, mapping, created_by)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (project_id, import_type)
       DO UPDATE SET mapping=$3, updated_at=now(), created_by=$4
       RETURNING import_mapping_id`,
      [projectId, type, mapping, String(createdBy).trim()]
    );
    res.json({ ok: true, import_mapping_id: rows[0].import_mapping_id });
  } catch (err) {
    next(err);
  }
});

app.get("/api/mapping-versions", async (req, res, next) => {
  try {
    if (!requireProjectAccess(req, res, req.query.projectId, "viewer")) {
      return;
    }
    const { projectId } = req.query;
    if (!projectId) {
      return badRequest(res, "projectId puuttuu.");
    }
    const { rows } = await query(
      `SELECT mapping_version_id, valid_from, valid_to, status, reason, created_by
       FROM mapping_versions
       WHERE project_id=$1
       ORDER BY valid_from DESC`,
      [projectId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

app.post("/api/mapping-versions", async (req, res, next) => {
  try {
    if (!requireProjectAccess(req, res, req.body.projectId, "editor")) {
      return;
    }
    const { projectId, validFrom, validTo, reason, createdBy } = req.body;
    if (!projectId) {
      return badRequest(res, "projectId puuttuu.");
    }
    if (!reason || String(reason).trim() === "") {
      return badRequest(res, "reason puuttuu.");
    }
    if (!createdBy || String(createdBy).trim() === "") {
      return badRequest(res, "createdBy puuttuu.");
    }
    const { rows } = await query(
      `INSERT INTO mapping_versions (project_id, valid_from, valid_to, reason, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING mapping_version_id`,
      [
        projectId,
        validFrom || new Date().toISOString().slice(0, 10),
        validTo || null,
        String(reason).trim(),
        String(createdBy).trim(),
      ]
    );

    await logMappingEvent({
      projectId,
      actor: String(createdBy).trim(),
      action: "CREATE_VERSION",
      payload: { mapping_version_id: rows[0].mapping_version_id },
    });

    res.status(201).json({ mapping_version_id: rows[0].mapping_version_id });
  } catch (err) {
    next(err);
  }
});

app.get("/api/mapping-lines", async (req, res, next) => {
  try {
    if (!requireProjectAccess(req, res, req.query.projectId, "viewer")) {
      return;
    }
    const { mappingVersionId } = req.query;
    if (!mappingVersionId) {
      return badRequest(res, "mappingVersionId puuttuu.");
    }
    const { rows } = await query(
      `SELECT mapping_line_id, work_littera_id, target_littera_id, allocation_rule, allocation_value, cost_type, note
       FROM mapping_lines
       WHERE mapping_version_id=$1
       ORDER BY created_at ASC`,
      [mappingVersionId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

app.post("/api/mapping-lines", async (req, res, next) => {
  try {
    if (!requireProjectAccess(req, res, req.body.projectId, "editor")) {
      return;
    }
    const {
      projectId,
      mappingVersionId,
      workLitteraId,
      targetLitteraId,
      allocationRule,
      allocationValue,
      costType,
      note,
      createdBy,
    } = req.body;

    if (!projectId || !mappingVersionId) {
      return badRequest(res, "projectId ja mappingVersionId puuttuu.");
    }
    if (!workLitteraId || !targetLitteraId) {
      return badRequest(res, "workLitteraId ja targetLitteraId puuttuu.");
    }
    if (!allocationRule) {
      return badRequest(res, "allocationRule puuttuu.");
    }
    if (!createdBy || String(createdBy).trim() === "") {
      return badRequest(res, "createdBy puuttuu.");
    }

    const { rows } = await query(
      `INSERT INTO mapping_lines
        (project_id, mapping_version_id, work_littera_id, target_littera_id, allocation_rule, allocation_value, cost_type, note, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING mapping_line_id`,
      [
        projectId,
        mappingVersionId,
        workLitteraId,
        targetLitteraId,
        allocationRule,
        toNumber(allocationValue),
        costType || null,
        note ? String(note).trim() : null,
        String(createdBy).trim(),
      ]
    );

    await logMappingEvent({
      projectId,
      actor: String(createdBy).trim(),
      action: "EDIT_DRAFT",
      payload: { mapping_version_id: mappingVersionId, mapping_line_id: rows[0].mapping_line_id },
    });

    res.status(201).json({ mapping_line_id: rows[0].mapping_line_id });
  } catch (err) {
    next(err);
  }
});

app.post("/api/mapping-activate", async (req, res, next) => {
  try {
    if (!requireProjectAccess(req, res, req.body.projectId, "manager")) {
      return;
    }
    const { projectId, mappingVersionId, approvedBy } = req.body;
    if (!projectId || !mappingVersionId) {
      return badRequest(res, "projectId ja mappingVersionId puuttuu.");
    }
    if (!approvedBy || String(approvedBy).trim() === "") {
      return badRequest(res, "approvedBy puuttuu.");
    }

    const { rowCount } = await query(
      `UPDATE mapping_versions
       SET status='ACTIVE', approved_at=now(), approved_by=$3
       WHERE mapping_version_id=$1 AND project_id=$2`,
      [mappingVersionId, projectId, String(approvedBy).trim()]
    );

    if (rowCount === 0) {
      return badRequest(res, "Mapping-versiota ei löytynyt.");
    }

    await logMappingEvent({
      projectId,
      actor: String(approvedBy).trim(),
      action: "ACTIVATE",
      payload: { mapping_version_id: mappingVersionId },
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

app.post("/api/mapping-corrections", async (req, res, next) => {
  try {
    const {
      projectId,
      mappingLineId,
      reason,
      approvedBy,
      newTargetLitteraId,
      newCostType,
      allocationRule,
      allocationValue,
      note,
    } = req.body;
    if (!requireProjectAccess(req, res, projectId, "manager")) {
      return;
    }
    if (!projectId || !mappingLineId) {
      return badRequest(res, "projectId ja mappingLineId puuttuu.");
    }
    if (!reason || String(reason).trim() === "") {
      return badRequest(res, "reason puuttuu.");
    }
    if (!approvedBy || String(approvedBy).trim() === "") {
      return badRequest(res, "approvedBy puuttuu.");
    }

    await withClient(async (client) => {
      await client.query("BEGIN");
      const { rows } = await client.query(
        `SELECT ml.mapping_line_id, ml.work_littera_id, ml.target_littera_id, ml.allocation_rule,
                ml.allocation_value, ml.cost_type, ml.note,
                mv.mapping_version_id, mv.status, mv.valid_from, mv.valid_to
         FROM mapping_lines ml
         JOIN mapping_versions mv ON mv.mapping_version_id = ml.mapping_version_id
         WHERE ml.mapping_line_id=$1 AND ml.project_id=$2`,
        [mappingLineId, projectId]
      );
      if (rows.length === 0) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Mapping-riviä ei löytynyt." });
        return;
      }
      const line = rows[0];
      if (line.status !== "ACTIVE") {
        await client.query("ROLLBACK");
        res.status(409).json({ error: "Vain ACTIVE-mappingia voi korjata." });
        return;
      }

      const reasonText = `Korjaus: ${String(reason).trim()}`;
      const { rows: versionRows } = await client.query(
        `INSERT INTO mapping_versions (project_id, valid_from, valid_to, reason, created_by)
         VALUES ($1,$2,$3,$4,$5)
         RETURNING mapping_version_id`,
        [projectId, line.valid_from, line.valid_to, reasonText, String(approvedBy).trim()]
      );
      const newVersionId = versionRows[0].mapping_version_id;

      await logMappingEventWithClient(client, {
        projectId,
        actor: String(approvedBy).trim(),
        action: "CREATE_VERSION",
        payload: { mapping_version_id: newVersionId, reason: reasonText },
      });

      await client.query(
        `INSERT INTO mapping_lines
          (project_id, mapping_version_id, work_littera_id, target_littera_id,
           allocation_rule, allocation_value, cost_type, note, created_by)
         SELECT project_id, $1, work_littera_id, target_littera_id,
                allocation_rule, allocation_value, cost_type, note, $2
         FROM mapping_lines
         WHERE mapping_version_id=$3 AND mapping_line_id <> $4`,
        [newVersionId, String(approvedBy).trim(), line.mapping_version_id, mappingLineId]
      );

      await client.query(
        `INSERT INTO mapping_lines
          (project_id, mapping_version_id, work_littera_id, target_littera_id,
           allocation_rule, allocation_value, cost_type, note, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          projectId,
          newVersionId,
          line.work_littera_id,
          newTargetLitteraId || line.target_littera_id,
          allocationRule || line.allocation_rule,
          allocationValue === undefined || allocationValue === null || allocationValue === ""
            ? line.allocation_value
            : toNumber(allocationValue),
          newCostType || line.cost_type,
          note || line.note,
          String(approvedBy).trim(),
        ]
      );

      await logMappingEventWithClient(client, {
        projectId,
        actor: String(approvedBy).trim(),
        action: "EDIT_DRAFT",
        payload: { mapping_version_id: newVersionId, corrected_from: line.mapping_version_id },
      });

      await client.query(
        `UPDATE mapping_versions
         SET status='RETIRED'
         WHERE mapping_version_id=$1`,
        [line.mapping_version_id]
      );
      await logMappingEventWithClient(client, {
        projectId,
        actor: String(approvedBy).trim(),
        action: "RETIRE",
        payload: { mapping_version_id: line.mapping_version_id },
      });

      await client.query(
        `UPDATE mapping_versions
         SET status='ACTIVE', approved_at=now(), approved_by=$2
         WHERE mapping_version_id=$1`,
        [newVersionId, String(approvedBy).trim()]
      );
      await logMappingEventWithClient(client, {
        projectId,
        actor: String(approvedBy).trim(),
        action: "ACTIVATE",
        payload: { mapping_version_id: newVersionId },
      });

      await logMappingEventWithClient(client, {
        projectId,
        actor: String(approvedBy).trim(),
        action: "APPLY_RETROACTIVE",
        payload: { mapping_version_id: newVersionId, note: "Reprocess pending (MVP stub)." },
      });

      await client.query("COMMIT");
      res.json({ ok: true, mapping_version_id: newVersionId });
    });
  } catch (err) {
    next(err);
  }
});

app.get("/api/planning-events", async (req, res, next) => {
  try {
    if (!requireProjectAccess(req, res, req.query.projectId, "viewer")) {
      return;
    }
    const { projectId, targetLitteraId } = req.query;
    if (!projectId || !targetLitteraId) {
      return badRequest(res, "projectId ja targetLitteraId ovat pakollisia.");
    }
    const { rows } = await query(
      `SELECT planning_event_id, event_time, created_by, status, summary, observations, risks, decisions, attachments
       FROM planning_events
       WHERE project_id=$1 AND target_littera_id=$2
       ORDER BY event_time DESC`,
      [projectId, targetLitteraId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

app.post("/api/planning-events", async (req, res, next) => {
  try {
    if (!requireProjectAccess(req, res, req.body.projectId, "editor")) {
      return;
    }
    const {
      projectId,
      targetLitteraId,
      createdBy,
      status,
      summary,
      observations,
      risks,
      decisions,
      attachments,
    } = req.body;

    if (!projectId || !targetLitteraId) {
      return badRequest(res, "projectId ja targetLitteraId puuttuu.");
    }
    if (!createdBy || String(createdBy).trim() === "") {
      return badRequest(res, "createdBy puuttuu.");
    }

    const { rows } = await query(
      `INSERT INTO planning_events
        (project_id, target_littera_id, created_by, status, summary, observations, risks, decisions, attachments)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING planning_event_id`,
      [
        projectId,
        targetLitteraId,
        String(createdBy).trim(),
        status || "DRAFT",
        summary ? String(summary).trim() : null,
        observations ? String(observations).trim() : null,
        risks ? String(risks).trim() : null,
        decisions ? String(decisions).trim() : null,
        Array.isArray(attachments) ? attachments : null,
      ]
    );

    res.status(201).json({ planning_event_id: rows[0].planning_event_id });
  } catch (err) {
    next(err);
  }
});

app.get("/api/forecast-events", async (req, res, next) => {
  try {
    if (!requireProjectAccess(req, res, req.query.projectId, "viewer")) {
      return;
    }
    const { projectId, targetLitteraId } = req.query;
    if (!projectId || !targetLitteraId) {
      return badRequest(res, "projectId ja targetLitteraId ovat pakollisia.");
    }
    const { rows } = await query(
      `SELECT forecast_event_id, event_time, created_by, comment, technical_progress, financial_progress, kpi_value
       FROM forecast_events
       WHERE project_id=$1 AND target_littera_id=$2
       ORDER BY event_time DESC`,
      [projectId, targetLitteraId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

app.post("/api/forecast-events", async (req, res, next) => {
  try {
    if (!requireProjectAccess(req, res, req.body.projectId, "editor")) {
      return;
    }
    const {
      projectId,
      targetLitteraId,
      createdBy,
      comment,
      technicalProgress,
      financialProgress,
      kpiValue,
      lines,
      ghostEntries,
    } = req.body;

    if (!projectId || !targetLitteraId) {
      return badRequest(res, "projectId ja targetLitteraId puuttuu.");
    }
    if (!createdBy || String(createdBy).trim() === "") {
      return badRequest(res, "createdBy puuttuu.");
    }

    const safeLines = Array.isArray(lines) ? lines : [];

    const result = await withClient(async (client) => {
      await client.query("BEGIN");
      const eventRes = await client.query(
        `INSERT INTO forecast_events
          (project_id, target_littera_id, created_by, comment, technical_progress, financial_progress, kpi_value)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         RETURNING forecast_event_id`,
        [
          projectId,
          targetLitteraId,
          String(createdBy).trim(),
          comment ? String(comment).trim() : null,
          toNumber(technicalProgress),
          toNumber(financialProgress),
          toNumber(kpiValue),
        ]
      );

      const forecastEventId = eventRes.rows[0].forecast_event_id;

      for (const line of safeLines) {
        const costType = String(line.costType || "").toUpperCase();
        const value = toNumber(line.forecastValue);
        if (!costType || value === null) {
          continue;
        }
        await client.query(
          `INSERT INTO forecast_event_lines
            (forecast_event_id, cost_type, forecast_value, memo_general)
           VALUES ($1,$2,$3,$4)`,
          [
            forecastEventId,
            costType,
            value,
            line.memoGeneral ? String(line.memoGeneral).trim() : null,
          ]
        );
      }

      const ghostList = Array.isArray(ghostEntries) ? ghostEntries : [];
      for (const entry of ghostList) {
        const weekEnding = entry.weekEnding ? String(entry.weekEnding).trim() : "";
        const amount = toNumber(entry.amount);
        if (!weekEnding || amount === null) {
          continue;
        }
        const payload = {
          weekEnding,
          amount,
          note: entry.note ? String(entry.note).trim() : "",
        };
        await client.query(
          `INSERT INTO forecast_row_memos
            (forecast_event_id, row_key, memo_text)
           VALUES ($1,$2,$3)`,
          [forecastEventId, `ghost:${weekEnding}`, JSON.stringify(payload)]
        );
      }

      await client.query("COMMIT");
      return forecastEventId;
    });

    res.status(201).json({ forecast_event_id: result });
  } catch (err) {
    next(err);
  }
});

app.put("/api/projects/:projectId/months/:month/forecast", async (req, res, next) => {
  try {
    if (!requireProjectAccess(req, res, req.params.projectId, "editor")) {
      return;
    }
    const { projectId, month } = req.params;
    const { forecastTotalEur, note, updatedBy } = req.body;
    if (!forecastTotalEur && forecastTotalEur !== 0) {
      return badRequest(res, "forecastTotalEur puuttuu.");
    }
    if (!updatedBy || String(updatedBy).trim() === "") {
      return badRequest(res, "updatedBy puuttuu.");
    }

    await withClient(async (client) => {
      await client.query("BEGIN");
      try {
        const state = await getOrCreateMonth(client, projectId, month);
        if (["M2_SENT_LOCKED", "M3_CORRECTION_PENDING", "M4_CORRECTED_LOCKED"].includes(state)) {
          await client.query("ROLLBACK");
          res.status(409).json({ error: "Kuukausi on lukittu." });
          return;
        }
        await client.query(
          `INSERT INTO month_forecast_events (project_id, month, forecast_total_eur, note, created_by)
           VALUES ($1,$2,$3,$4,$5)`,
          [projectId, month, toNumber(forecastTotalEur), note ? String(note).trim() : null, String(updatedBy).trim()]
        );
        await client.query(
          `INSERT INTO month_forecasts (project_id, month, forecast_total_eur, note, updated_by)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (project_id, month)
           DO UPDATE SET forecast_total_eur=$3, note=$4, updated_at=now(), updated_by=$5`,
          [projectId, month, toNumber(forecastTotalEur), note ? String(note).trim() : null, String(updatedBy).trim()]
        );
        await client.query("COMMIT");
        res.json({ project_id: projectId, month, forecast_total_eur: toNumber(forecastTotalEur), note: note || "" });
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    });
  } catch (err) {
    next(err);
  }
});

app.post("/api/projects/:projectId/months/:month/send-reports", async (req, res, next) => {
  try {
    if (!requireProjectAccess(req, res, req.params.projectId, "manager")) {
      return;
    }
    const { projectId, month } = req.params;
    const { recipients, sentBy } = req.body;
    if (!sentBy || String(sentBy).trim() === "") {
      return badRequest(res, "sentBy puuttuu.");
    }
    const recips = Array.isArray(recipients) ? recipients : [];
    const artifact = "LINK";
    await withClient(async (client) => {
      await client.query("BEGIN");
      try {
        const state = await getOrCreateMonth(client, projectId, month);
        if (!["M0_OPEN_DRAFT", "M1_READY_TO_SEND"].includes(state)) {
          await client.query("ROLLBACK");
          res.status(409).json({ error: "Kuukausi ei ole avoin." });
          return;
        }
        const payload = {
          projectId,
          month,
          recipients: recips,
          sentBy: String(sentBy).trim(),
          generatedAt: new Date().toISOString(),
        };
        const checksum = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
        const recipientsJson = JSON.stringify(recips);
        const { rows } = await client.query(
          `INSERT INTO report_packages
            (project_id, month, sent_by_user_id, recipients, artifact_type, artifact_uri, checksum)
           VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7)
           RETURNING package_id, sent_at, checksum, artifact_type, artifact_uri`,
          [
            projectId,
            month,
            String(sentBy).trim(),
            recipientsJson,
            artifact,
            `report://${projectId}/${month}/${checksum}`,
            checksum,
          ]
        );
        await setMonthState(client, {
          projectId,
          month,
          fromState: state,
          toState: "M2_SENT_LOCKED",
          actor: String(sentBy).trim(),
          reason: "Reports sent",
        });
        await client.query("COMMIT");
        res.json({ month_state: "M2_SENT_LOCKED", report_package: rows[0] });
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    });
  } catch (err) {
    next(err);
  }
});

app.post("/api/projects/:projectId/months/:month/corrections/request", async (req, res, next) => {
  try {
    if (!requireProjectAccess(req, res, req.params.projectId, "manager")) {
      return;
    }
    const { projectId, month } = req.params;
    const { reason, patch, requestedBy } = req.body;
    if (!reason || String(reason).trim() === "") {
      return badRequest(res, "reason puuttuu.");
    }
    if (!patch || typeof patch !== "object") {
      return badRequest(res, "patch puuttuu.");
    }
    if (!requestedBy || String(requestedBy).trim() === "") {
      return badRequest(res, "requestedBy puuttuu.");
    }
    await withClient(async (client) => {
      await client.query("BEGIN");
      try {
        const state = await getOrCreateMonth(client, projectId, month);
        if (state !== "M2_SENT_LOCKED") {
          await client.query("ROLLBACK");
          res.status(409).json({ error: "Korjaus sallittu vain lukitun kuukauden jälkeen." });
          return;
        }
        const { rows } = await client.query(
          `INSERT INTO month_corrections
            (project_id, month, state, requested_by_user_id, reason, patch)
           VALUES ($1,$2,'REQUESTED',$3,$4,$5)
           RETURNING correction_id`,
          [projectId, month, String(requestedBy).trim(), String(reason).trim(), patch]
        );
        await client.query(
          `INSERT INTO month_correction_events
            (correction_id, project_id, month, state, actor_user_id, reason)
           VALUES ($1,$2,$3,'REQUESTED',$4,$5)`,
          [rows[0].correction_id, projectId, month, String(requestedBy).trim(), "Correction requested"]
        );
        await setMonthState(client, {
          projectId,
          month,
          fromState: state,
          toState: "M3_CORRECTION_PENDING",
          actor: String(requestedBy).trim(),
          reason: "Correction requested",
        });
        await client.query("COMMIT");
        res.status(201).json({ correction_id: rows[0].correction_id, state: "REQUESTED" });
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    });
  } catch (err) {
    next(err);
  }
});

app.post(
  "/api/projects/:projectId/months/:month/corrections/:correctionId/approve",
  async (req, res, next) => {
    try {
      if (!requireProjectAccess(req, res, req.params.projectId, "manager")) {
        return;
      }
      const { projectId, month, correctionId } = req.params;
      const { approvedBy } = req.body;
      if (!approvedBy || String(approvedBy).trim() === "") {
        return badRequest(res, "approvedBy puuttuu.");
      }
      await withClient(async (client) => {
        await client.query("BEGIN");
        try {
          const { rows } = await client.query(
            "SELECT state FROM month_corrections WHERE correction_id=$1 AND project_id=$2",
            [correctionId, projectId]
          );
          if (rows.length === 0) {
            await client.query("ROLLBACK");
            res.status(404).json({ error: "Korjausta ei löytynyt." });
            return;
          }
          if (rows[0].state !== "REQUESTED") {
            await client.query("ROLLBACK");
            res.status(409).json({ error: "Korjaus ei ole odotustilassa." });
            return;
          }
          await client.query(
            `UPDATE month_corrections
             SET state='APPROVED', approved_by_user_id=$2, updated_at=now()
             WHERE correction_id=$1`,
            [correctionId, String(approvedBy).trim()]
          );
          await client.query(
            `INSERT INTO month_correction_events
              (correction_id, project_id, month, state, actor_user_id, reason)
             VALUES ($1,$2,$3,'APPROVED',$4,$5)`,
            [correctionId, projectId, month, String(approvedBy).trim(), "Correction approved"]
          );
          const payload = { projectId, month, correctionId, approvedBy: String(approvedBy).trim() };
          const checksum = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
          const recipientsJson = JSON.stringify([]);
          const { rows: pkgRows } = await client.query(
            `INSERT INTO report_packages
              (project_id, month, sent_by_user_id, recipients, artifact_type, artifact_uri, checksum, correction_id)
             VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8)
             RETURNING package_id, sent_at, checksum`,
            [
              projectId,
              month,
              String(approvedBy).trim(),
              recipientsJson,
              "LINK",
              `report://${projectId}/${month}/${checksum}`,
              checksum,
              correctionId,
            ]
          );
          const state = await getOrCreateMonth(client, projectId, month);
          await setMonthState(client, {
            projectId,
            month,
            fromState: state,
            toState: "M4_CORRECTED_LOCKED",
            actor: String(approvedBy).trim(),
            reason: "Correction approved",
          });
          await client.query("COMMIT");
          res.json({ correction_id: correctionId, state: "APPROVED", report_package: pkgRows[0] });
        } catch (err) {
          await client.query("ROLLBACK");
          throw err;
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

app.post(
  "/api/projects/:projectId/months/:month/corrections/:correctionId/reject",
  async (req, res, next) => {
    try {
      if (!requireProjectAccess(req, res, req.params.projectId, "manager")) {
        return;
      }
      const { projectId, month, correctionId } = req.params;
      const { rejectedBy } = req.body;
      if (!rejectedBy || String(rejectedBy).trim() === "") {
        return badRequest(res, "rejectedBy puuttuu.");
      }
      await withClient(async (client) => {
        await client.query("BEGIN");
        try {
          const { rows } = await client.query(
            "SELECT state FROM month_corrections WHERE correction_id=$1 AND project_id=$2",
            [correctionId, projectId]
          );
          if (rows.length === 0) {
            await client.query("ROLLBACK");
            res.status(404).json({ error: "Korjausta ei löytynyt." });
            return;
          }
          if (rows[0].state !== "REQUESTED") {
            await client.query("ROLLBACK");
            res.status(409).json({ error: "Korjaus ei ole odotustilassa." });
            return;
          }
          await client.query(
            `UPDATE month_corrections
             SET state='REJECTED', approved_by_user_id=$2, updated_at=now()
             WHERE correction_id=$1`,
            [correctionId, String(rejectedBy).trim()]
          );
          await client.query(
            `INSERT INTO month_correction_events
              (correction_id, project_id, month, state, actor_user_id, reason)
             VALUES ($1,$2,$3,'REJECTED',$4,$5)`,
            [correctionId, projectId, month, String(rejectedBy).trim(), "Correction rejected"]
          );
          const state = await getOrCreateMonth(client, projectId, month);
          await setMonthState(client, {
            projectId,
            month,
            fromState: state,
            toState: "M2_SENT_LOCKED",
            actor: String(rejectedBy).trim(),
            reason: "Correction rejected",
          });
          await client.query("COMMIT");
          res.json({ correction_id: correctionId, state: "REJECTED" });
        } catch (err) {
          await client.query("ROLLBACK");
          throw err;
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

app.get("/api/projects/:projectId/months/:month/report-packages", async (req, res, next) => {
  try {
    if (!requireProjectAccess(req, res, req.params.projectId, "viewer")) {
      return;
    }
    const { projectId, month } = req.params;
    const { rows } = await query(
      `SELECT package_id, project_id, month, sent_at, sent_by_user_id, recipients, artifact_type, artifact_uri, checksum
       FROM report_packages
       WHERE project_id=$1 AND month=$2
       ORDER BY sent_at DESC`,
      [projectId, month]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

app.get("/api/report-packages/:packageId/download", async (req, res, next) => {
  try {
    const { packageId } = req.params;
    const { rows } = await query(
      `SELECT package_id, project_id, artifact_type, artifact_uri, checksum
       FROM report_packages
       WHERE package_id=$1`,
      [packageId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Report packagea ei löytynyt." });
    }
    if (!requireProjectAccess(req, res, rows[0].project_id, "viewer")) {
      return;
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

app.get("/api/report/target-summary", async (req, res, next) => {
  try {
    if (!requireProjectAccess(req, res, req.query.projectId, "viewer")) {
      return;
    }
    const { projectId, targetLitteraId } = req.query;
    if (!projectId || !targetLitteraId) {
      return badRequest(res, "projectId ja targetLitteraId ovat pakollisia.");
    }

    const planning = await query(
      `SELECT status, event_time, created_by, summary
       FROM v_planning_current
       WHERE project_id=$1 AND target_littera_id=$2`,
      [projectId, targetLitteraId]
    );

    const forecast = await query(
      `SELECT event_time, created_by, comment, technical_progress, financial_progress, kpi_value
       FROM v_forecast_current
       WHERE project_id=$1 AND target_littera_id=$2`,
      [projectId, targetLitteraId]
    );

    const forecastTotals = await query(
      `SELECT cost_type, ROUND(SUM(forecast_value)::numeric, 2) AS total
       FROM v_forecast_current_lines
       WHERE project_id=$1 AND target_littera_id=$2
       GROUP BY cost_type
       ORDER BY cost_type`,
      [projectId, targetLitteraId]
    );

    const actualTotals = await query(
      `SELECT cost_type, ROUND(SUM(allocated_amount)::numeric, 2) AS total
       FROM v_actuals_mapped
       WHERE project_id=$1 AND target_littera_id=$2
       GROUP BY cost_type
       ORDER BY cost_type`,
      [projectId, targetLitteraId]
    );

    const budgetTotals = await query(
      `SELECT cost_type, ROUND(SUM(amount)::numeric, 2) AS total
       FROM budget_lines
       WHERE project_id=$1 AND target_littera_id=$2
       GROUP BY cost_type
       ORDER BY cost_type`,
      [projectId, targetLitteraId]
    );

    res.json({
      planning: planning.rows[0] || null,
      forecast: forecast.rows[0] || null,
      totals: {
        budget: budgetTotals.rows,
        actual: actualTotals.rows,
        forecast: forecastTotals.rows,
      },
    });
  } catch (err) {
    next(err);
  }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Palvelinvirhe", detail: err.message });
});

app.get(
  ["/", "/setup", "/mapping", "/planning", "/weekly", "/forecast", "/report", "/history"],
  (_req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
  }
);

app.listen(port, () => {
  console.log(`MVP API/UI: http://localhost:${port}`);
});
