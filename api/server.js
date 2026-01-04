import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import { createHash, randomBytes } from "crypto";
import dotenv from "dotenv";
import PDFDocument from "pdfkit";
import { query, withClient } from "./db.js";
import {
  buildHeaderLookup,
  computeBudgetAggregates,
  parseFiNumber,
  selectActiveCostHeaders,
} from "./import-staging.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const app = express();
const port = Number(process.env.APP_PORT || process.env.PORT || 3000);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.get("/login", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});
app.get("/logout", (_req, res) => {
  res.setHeader(
    "Set-Cookie",
    "authToken=; Path=/; Max-Age=0; SameSite=Lax"
  );
  res.redirect("/login?loggedOut=1");
});
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && origin.includes(".app.github.dev")) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
  }
  next();
});
const PUBLIC_API_PATHS = new Set([
  "/terminology/dictionary",
  "/users",
  "/login",
  "/health",
]);

app.use("/api", (req, res, next) => {
  if (PUBLIC_API_PATHS.has(req.path)) {
    return next();
  }
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
const IMPORT_TYPES = ["BUDGET", "JYDA"];
const PROJECT_ROLE_RANK = {
  viewer: 1,
  editor: 2,
  manager: 3,
  owner: 4,
};
const ROLE_CODE_TO_PROJECT_ROLE = {
  SITE_FOREMAN: "editor",
  GENERAL_FOREMAN: "editor",
  PROJECT_MANAGER: "manager",
  PRODUCTION_MANAGER: "owner",
  PROCUREMENT: "viewer",
  EXEC_READONLY: "viewer",
};

function parseToken(req) {
  const auth = req.header("authorization") || "";
  let tokenValue = "";
  const parts = auth.split(" ");
  if (parts.length === 2 && parts[0] === "Bearer") {
    tokenValue = parts[1];
  }
  if (!tokenValue && req.headers.cookie) {
    const match = req.headers.cookie.match(/(?:^|;\s*)authToken=([^;]+)/);
    if (match) {
      tokenValue = decodeURIComponent(match[1]);
    }
  }
  if (!tokenValue) {
    return null;
  }
  try {
    const raw = Buffer.from(tokenValue, "base64").toString("utf8");
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

function hashPin(pin) {
  const salt = process.env.PIN_SALT || "dev-salt";
  return createHash("sha256").update(`${pin}${salt}`).digest("hex");
}

function encodeToken(payload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
}

function selectHigherProjectRole(currentRole, nextRole) {
  if (!currentRole) {
    return nextRole;
  }
  return PROJECT_ROLE_RANK[nextRole] > PROJECT_ROLE_RANK[currentRole]
    ? nextRole
    : currentRole;
}

async function loadUserOrganizations(userId) {
  const { rows } = await query(
    `SELECT o.organization_id, o.slug, o.name
     FROM organization_memberships m
     JOIN organizations o ON o.organization_id = m.organization_id
     WHERE m.user_id=$1 AND m.left_at IS NULL
     ORDER BY o.name`,
    [userId]
  );
  return rows;
}

async function loadProjectRoles(userId, organizationId) {
  const params = [userId];
  let orgFilter = "";
  if (organizationId) {
    params.push(organizationId);
    orgFilter = "AND p.organization_id = $2";
  }
  const { rows } = await query(
    `SELECT pra.project_id, pra.role_code
     FROM project_role_assignments pra
     JOIN projects p ON p.project_id = pra.project_id
     WHERE pra.user_id=$1 AND pra.revoked_at IS NULL ${orgFilter}`,
    params
  );
  const projectRoles = {};
  for (const row of rows) {
    const mapped = ROLE_CODE_TO_PROJECT_ROLE[row.role_code];
    if (!mapped) {
      continue;
    }
    const currentRole = projectRoles[row.project_id];
    projectRoles[row.project_id] = selectHigherProjectRole(currentRole, mapped);
  }
  return projectRoles;
}

async function loadSystemRole(userId, organizationId) {
  if (!organizationId) {
    return null;
  }
  const { rows } = await query(
    `SELECT role_code
     FROM organization_role_assignments
     WHERE organization_id = $1 AND user_id = $2 AND revoked_at IS NULL
     ORDER BY granted_at DESC
     LIMIT 1`,
    [organizationId, userId]
  );
  if (rows.length === 0) {
    return null;
  }
  if (rows[0].role_code === "ORG_ADMIN") {
    return "admin";
  }
  if (rows[0].role_code === "SELLER") {
    return "seller";
  }
  return null;
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

function normalizeImportType(value) {
  if (!value || typeof value !== "string") {
    return null;
  }
  const upper = value.toUpperCase().trim();
  return IMPORT_TYPES.includes(upper) ? upper : null;
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function validateBudgetImportMapping(mapping) {
  if (!mapping || typeof mapping !== "object") {
    return "mapping puuttuu tai on virheellinen.";
  }
  const source = mapping.columns && typeof mapping.columns === "object" ? mapping.columns : mapping;
  const fields = [
    "littera_code",
    "littera_title",
    "labor_eur",
    "material_eur",
    "subcontract_eur",
    "rental_eur",
    "other_eur",
    "sum_eur",
  ];
  let found = false;
  for (const key of fields) {
    if (key in source) {
      found = true;
      if (!isNonEmptyString(source[key])) {
        return `mapping.${key} täytyy olla merkkijono.`;
      }
    }
  }
  if (!found) {
    return "mapping ei sisällä tunnettuja budjettiavaimia.";
  }
  return null;
}

function validateJydaImportMapping(mapping) {
  if (!mapping || typeof mapping !== "object") {
    return "mapping puuttuu tai on virheellinen.";
  }
  const source = mapping.mapping && typeof mapping.mapping === "object" ? mapping.mapping : mapping;
  const keys = [
    "sheet_name",
    "code_column",
    "name_column",
    "metrics",
    "csv_code_header",
    "csv_name_header",
    "csv_headers",
  ];
  const hasKnownKey = keys.some((key) => key in source);
  if (!hasKnownKey) {
    return "mapping ei sisällä tunnettuja JYDA-avaimia.";
  }
  if (source.sheet_name && !isNonEmptyString(source.sheet_name)) {
    return "mapping.sheet_name täytyy olla merkkijono.";
  }
  if (source.code_column && !/^[A-Z]+$/.test(String(source.code_column))) {
    return "mapping.code_column täytyy olla Excel-sarakkeen kirjain (esim. A).";
  }
  if (source.name_column && !/^[A-Z]+$/.test(String(source.name_column))) {
    return "mapping.name_column täytyy olla Excel-sarakkeen kirjain (esim. B).";
  }
  if (source.metrics) {
    if (typeof source.metrics !== "object") {
      return "mapping.metrics täytyy olla objekti.";
    }
    for (const value of Object.values(source.metrics)) {
      if (!/^[A-Z]+$/.test(String(value))) {
        return "mapping.metrics arvot täytyy olla Excel-sarakkeen kirjaimia (esim. C).";
      }
    }
  }
  if (source.csv_code_header && !isNonEmptyString(source.csv_code_header)) {
    return "mapping.csv_code_header täytyy olla merkkijono.";
  }
  if (source.csv_name_header && !isNonEmptyString(source.csv_name_header)) {
    return "mapping.csv_name_header täytyy olla merkkijono.";
  }
  if (source.csv_headers) {
    if (typeof source.csv_headers !== "object") {
      return "mapping.csv_headers täytyy olla objekti.";
    }
    for (const value of Object.values(source.csv_headers)) {
      if (!isNonEmptyString(value)) {
        return "mapping.csv_headers arvot täytyy olla merkkijonoja.";
      }
    }
  }
  return null;
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

async function logAppAudit({ projectId, actor, action, payload }) {
  await query(
    "INSERT INTO app_audit_log (project_id, actor, action, payload) VALUES ($1,$2,$3,$4)",
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

function reportSnapshotUri(checksum) {
  return `snapshot://${checksum}`;
}

function csvEscape(value) {
  if (value === null || value === undefined) {
    return "";
  }
  const text = String(value);
  const escaped = text.replace(/"/g, '""');
  if (/[",\n]/.test(escaped)) {
    return `"${escaped}"`;
  }
  return escaped;
}

function parseCsvRows(text, delimiter = ";") {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === delimiter) {
      row.push(field);
      field = "";
      continue;
    }
    if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }
    if (ch === "\r") {
      continue;
    }
    field += ch;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  if (rows.length === 0) {
    return { headers: [], rows: [] };
  }

  const headerRow = rows.shift() || [];
  const headers = headerRow.map((value, idx) => {
    let clean = String(value || "").trim();
    if (idx === 0 && clean.startsWith("\ufeff")) {
      clean = clean.slice(1);
    }
    return clean;
  });

  const dataRows = rows.filter((r) => r.some((value) => String(value || "").trim() !== ""));
  return { headers, rows: dataRows };
}

function formatSnapshotCsv(rows) {
  if (rows.length === 0) {
    return "";
  }
  const columns = Object.keys(rows[0]).sort();
  const header = columns.join(",");
  const lines = rows.map((row) =>
    columns.map((col) => csvEscape(row[col])).join(",")
  );
  return [header, ...lines].join("\n") + "\n";
}

function buildReportPdf({ projectId, month, checksum, rows }) {
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  doc.fontSize(18).text("Report package (snapshot)", { underline: true });
  doc.moveDown();
  doc.fontSize(12).text(`Project: ${projectId}`);
  doc.text(`Month: ${month}`);
  doc.text(`Checksum: ${checksum}`);
  doc.moveDown();
  doc.fontSize(10).text(`Rows: ${rows.length}`);
  doc.moveDown();
  rows.slice(0, 200).forEach((row, idx) => {
    doc.fontSize(9).text(`${idx + 1}. ${JSON.stringify(row)}`);
  });
  return doc;
}

async function findMonthColumn(client, viewName) {
  const candidates = [
    "month_key",
    "month",
    "month_end",
    "month_start",
    "period",
    "year_month",
    "ym",
  ];
  const { rows } = await client.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_name=$1 AND column_name = ANY($2)`,
    [viewName, candidates]
  );
  const found = rows.map((row) => row.column_name);
  for (const candidate of candidates) {
    if (found.includes(candidate)) {
      return candidate;
    }
  }
  return null;
}

async function viewHasColumn(client, viewName, columnName) {
  const { rows } = await client.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_name=$1 AND column_name=$2
     LIMIT 1`,
    [viewName, columnName]
  );
  return rows.length > 0;
}

async function insertSnapshotFromView(
  client,
  { packageId, projectId, month, rowType, viewName, monthColumn, monthMatch }
) {
  const hasProjectId = await viewHasColumn(client, viewName, "project_id");
  if (!hasProjectId) {
    return;
  }
  let monthFilter = "";
  if (monthColumn) {
    if (monthMatch === "prefix") {
      monthFilter = `AND v.${monthColumn}::text LIKE $3 || '%'`;
    } else {
      monthFilter = `AND v.${monthColumn}::text=$3`;
    }
  }
  await client.query(
    `INSERT INTO report_package_snapshots (package_id, project_id, month, row_type, row_data)
     SELECT $1, $2, $3, $4, to_jsonb(v)
     FROM ${viewName} v
     WHERE v.project_id=$2 ${monthFilter}`,
    [packageId, projectId, month, rowType]
  );
}

async function insertReportPackageSnapshots(client, { packageId, projectId, month }) {
  await insertSnapshotFromView(client, {
    packageId,
    projectId,
    month,
    rowType: "work_phase_current",
    viewName: "v_report_work_phase_current",
  });
  await insertSnapshotFromView(client, {
    packageId,
    projectId,
    month,
    rowType: "project_current",
    viewName: "v_report_project_current",
  });
  await insertSnapshotFromView(client, {
    packageId,
    projectId,
    month,
    rowType: "project_main_group_current",
    viewName: "v_report_project_main_group_current",
  });
  await insertSnapshotFromView(client, {
    packageId,
    projectId,
    month,
    rowType: "project_weekly_ev",
    viewName: "v_report_project_weekly_ev",
  });
  await insertSnapshotFromView(client, {
    packageId,
    projectId,
    month,
    rowType: "monthly_work_phase",
    viewName: "v_report_monthly_work_phase",
    monthColumn: "month_key",
    monthMatch: "prefix",
  });
  const monthColumn = await findMonthColumn(client, "v_report_monthly_target_cost_raw");
  if (monthColumn) {
    await insertSnapshotFromView(client, {
      packageId,
      projectId,
      month,
      rowType: "monthly_target_raw",
      viewName: "v_report_monthly_target_cost_raw",
      monthColumn,
      monthMatch: "prefix",
    });
  }
  await insertSnapshotFromView(client, {
    packageId,
    projectId,
    month,
    rowType: "top_overruns",
    viewName: "v_report_top_overruns_work_phases",
  });
  await insertSnapshotFromView(client, {
    packageId,
    projectId,
    month,
    rowType: "lowest_cpi",
    viewName: "v_report_lowest_cpi_work_phases",
  });
  await insertSnapshotFromView(client, {
    packageId,
    projectId,
    month,
    rowType: "top_selvitettavat",
    viewName: "v_report_top_selvitettavat_littera",
  });
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

app.get("/api/terminology/dictionary", async (req, res, next) => {
  try {
    const locale =
      typeof req.query.locale === "string" && req.query.locale.trim() !== ""
        ? req.query.locale.trim()
        : "fi";
    const fallback =
      typeof req.query.fallback === "string" && req.query.fallback.trim() !== ""
        ? req.query.fallback.trim()
        : "en";
    const orgId =
      typeof req.query.orgId === "string" && req.query.orgId.trim() !== ""
        ? req.query.orgId.trim()
        : null;

    let organizationId = null;
    if (orgId) {
      const token = parseToken(req);
      if (!token) {
        return res.status(401).json({ error: "Token puuttuu tai on virheellinen." });
      }
      const membership = await query(
        `SELECT 1
         FROM organization_memberships
         WHERE organization_id=$1 AND user_id=$2 AND left_at IS NULL`,
        [orgId, token.userId]
      );
      if (membership.rowCount === 0) {
        return res.status(403).json({ error: "Ei oikeuksia tähän organisaatioon." });
      }
      organizationId = orgId;
    }

    const { rows } = await query(
      "SELECT term_key, label, description, locale_used, source FROM terminology_get_dictionary($1,$2,$3)",
      [organizationId, locale, fallback]
    );
    res.json({ terms: rows });
  } catch (err) {
    next(err);
  }
});

app.get("/api/users", async (_req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT username, display_name
       FROM users
       WHERE is_active = true
       ORDER BY COALESCE(display_name, username), username`
    );
    res.json({ users: rows });
  } catch (err) {
    next(err);
  }
});

app.get("/api/admin/users", async (req, res, next) => {
  try {
    if (!requireSystemRole(req, res, ["admin", "superadmin"])) {
      return;
    }
    const orgId = req.user?.organizationId;
    if (!orgId) {
      return badRequest(res, "organizationId puuttuu.");
    }
    const { rows } = await query(
      `SELECT u.user_id, u.username, u.display_name, u.email
       FROM users u
       JOIN organization_memberships m
         ON m.user_id = u.user_id AND m.organization_id = $1 AND m.left_at IS NULL
       WHERE u.is_active = true
       ORDER BY COALESCE(u.display_name, u.username), u.username`,
      [orgId]
    );
    res.json({ users: rows });
  } catch (err) {
    next(err);
  }
});

app.post("/api/admin/users", async (req, res, next) => {
  try {
    if (!requireSystemRole(req, res, ["admin", "superadmin"])) {
      return;
    }
    const orgId = req.user?.organizationId;
    if (!orgId) {
      return badRequest(res, "organizationId puuttuu.");
    }
    const { username, displayName, email, pin, orgRole } = req.body || {};
    if (!username || String(username).trim() === "") {
      return badRequest(res, "username puuttuu.");
    }
    if (!pin || String(pin).trim() === "") {
      return badRequest(res, "pin puuttuu.");
    }
    const allowedOrgRoles = new Set(["ORG_ADMIN", "SELLER"]);
    if (orgRole && !allowedOrgRoles.has(orgRole)) {
      return badRequest(res, "orgRole ei kelpaa.");
    }

    const existing = await query("SELECT user_id FROM users WHERE username=$1", [
      String(username).trim(),
    ]);
    if (existing.rowCount > 0) {
      return res.status(409).json({ error: "Käyttäjä on jo olemassa." });
    }

    const pinHash = hashPin(String(pin).trim());
    const createdBy = String(req.user.userId || "admin");

    const { rows } = await query(
      `INSERT INTO users (username, display_name, email, pin_hash, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING user_id`,
      [
        String(username).trim(),
        displayName ? String(displayName).trim() : null,
        email ? String(email).trim() : null,
        pinHash,
        createdBy,
      ]
    );
    const userId = rows[0].user_id;

    await query(
      `INSERT INTO organization_memberships (organization_id, user_id, joined_by)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [orgId, userId, createdBy]
    );

    if (orgRole) {
      await query(
        `INSERT INTO organization_role_assignments (organization_id, user_id, role_code, granted_by)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING`,
        [orgId, userId, orgRole, createdBy]
      );
    }

    res.status(201).json({ user_id: userId });
  } catch (err) {
    next(err);
  }
});

app.post("/api/admin/users/:userId/org-role", async (req, res, next) => {
  try {
    if (!requireSystemRole(req, res, ["admin", "superadmin"])) {
      return;
    }
    const orgId = req.user?.organizationId;
    if (!orgId) {
      return badRequest(res, "organizationId puuttuu.");
    }
    const { userId } = req.params;
    const { roleCode } = req.body || {};
    const allowedOrgRoles = new Set(["ORG_ADMIN", "SELLER"]);
    if (!roleCode || !allowedOrgRoles.has(roleCode)) {
      return badRequest(res, "roleCode ei kelpaa.");
    }
    const createdBy = String(req.user.userId || "admin");
    await query(
      `INSERT INTO organization_role_assignments (organization_id, user_id, role_code, granted_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING`,
      [orgId, userId, roleCode, createdBy]
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

app.post("/api/admin/users/:userId/project-roles", async (req, res, next) => {
  try {
    if (!requireSystemRole(req, res, ["admin", "superadmin"])) {
      return;
    }
    const { userId } = req.params;
    const { projectId, roleCode } = req.body || {};
    if (!projectId) {
      return badRequest(res, "projectId puuttuu.");
    }
    const allowedProjectRoles = new Set([
      "SITE_FOREMAN",
      "GENERAL_FOREMAN",
      "PROJECT_MANAGER",
      "PRODUCTION_MANAGER",
      "PROCUREMENT",
      "EXEC_READONLY",
    ]);
    if (!roleCode || !allowedProjectRoles.has(roleCode)) {
      return badRequest(res, "roleCode ei kelpaa.");
    }
    const orgId = req.user?.organizationId;
    const { rowCount } = await query(
      "SELECT 1 FROM projects WHERE project_id=$1 AND organization_id=$2",
      [projectId, orgId]
    );
    if (rowCount === 0) {
      return res.status(403).json({ error: "Projekti ei kuulu organisaatioon." });
    }
    const createdBy = String(req.user.userId || "admin");
    await query(
      `INSERT INTO project_role_assignments (project_id, user_id, role_code, granted_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING`,
      [projectId, userId, roleCode, createdBy]
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

app.post("/api/assistant/chat", async (req, res, next) => {
  try {
    if (!OPENAI_API_KEY) {
      return res.status(400).json({ error: "OPENAI_API_KEY puuttuu." });
    }
    const { messages } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return badRequest(res, "messages puuttuu.");
    }

    const systemPrompt = [
      "Olet Ennuste-sovelluksen avustaja.",
      "Vastaa lyhyesti ja selkeästi suomeksi.",
      "Käytä termejä: työlittera, tavoitearvio-littera, mapping, ennustetapahtuma, suunnitelma.",
      "Muista append-only-periaate ja että suunnitelma tehdään ennen ennustetta.",
    ].join(" ");

    const payload = {
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      ],
      temperature: 0.2,
    };

    let response;
    try {
      response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      return res
        .status(502)
        .json({ error: "OpenAI-yhteys epäonnistui. Tarkista verkkoyhteys." });
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res.status(502).json({ error: data?.error?.message || "OpenAI-virhe." });
    }
    const message = data?.choices?.[0]?.message?.content || "";
    res.json({ message });
  } catch (err) {
    res.status(500).json({ error: "AI-avustaja epäonnistui." });
  }
});

app.post("/api/login", async (req, res, next) => {
  try {
    const { username, pin } = req.body || {};
    if (!username || !pin) {
      return badRequest(res, "username ja pin vaaditaan.");
    }
    const { rows } = await query(
      `SELECT user_id, username, pin_hash
       FROM users
       WHERE username=$1 AND is_active=true`,
      [String(username).trim()]
    );
    if (rows.length === 0 || !rows[0].pin_hash) {
      return res.status(401).json({ error: "Virheellinen käyttäjä tai PIN." });
    }
    const pinHash = hashPin(String(pin).trim());
    if (rows[0].pin_hash !== pinHash) {
      return res.status(401).json({ error: "Virheellinen käyttäjä tai PIN." });
    }

    const userId = rows[0].user_id;
    const organizations = await loadUserOrganizations(userId);
    const currentOrganizationId = organizations[0]?.organization_id || null;
    const projectRoles = await loadProjectRoles(userId, currentOrganizationId);
    const systemRole = await loadSystemRole(userId, currentOrganizationId);

    const token = encodeToken({
      userId,
      organizationId: currentOrganizationId,
      systemRole,
      projectRoles,
    });

    res.setHeader(
      "Set-Cookie",
      `authToken=${encodeURIComponent(token)}; Path=/; SameSite=Lax`
    );
    res.json({ token });
  } catch (err) {
    next(err);
  }
});

app.post("/api/logout", (_req, res) => {
  res.setHeader(
    "Set-Cookie",
    "authToken=; Path=/; Max-Age=0; SameSite=Lax"
  );
  res.status(204).end();
});

app.get("/api/me", async (req, res, next) => {
  try {
    const token = req.user;
    if (!token?.userId) {
      return res.status(401).json({ error: "Token puuttuu tai on virheellinen." });
    }

    const { rows: userRows } = await query(
      `SELECT user_id, username, display_name
       FROM users
       WHERE user_id=$1 AND is_active=true`,
      [token.userId]
    );
    if (userRows.length === 0) {
      return res.status(404).json({ error: "Käyttäjää ei löydy." });
    }

    const orgRows = await loadUserOrganizations(token.userId);

    const currentOrganizationId = orgRows.find(
      (org) => org.organization_id === token.organizationId
    )
      ? token.organizationId
      : orgRows[0]?.organization_id || null;
    res.json({
      user: {
        user_id: userRows[0].user_id,
        username: userRows[0].username,
        display_name: userRows[0].display_name,
        system_role: token.systemRole || null,
      },
      organizations: orgRows,
      current_organization_id: currentOrganizationId,
    });
  } catch (err) {
    next(err);
  }
});

app.get("/api/organizations", async (req, res, next) => {
  try {
    const token = req.user;
    if (!token?.userId) {
      return res.status(401).json({ error: "Token puuttuu tai on virheellinen." });
    }
    const organizations = await loadUserOrganizations(token.userId);
    res.json({ organizations });
  } catch (err) {
    next(err);
  }
});

app.post("/api/session/switch-org", async (req, res, next) => {
  try {
    const token = req.user;
    if (!token?.userId) {
      return res.status(401).json({ error: "Token puuttuu tai on virheellinen." });
    }
    const { organizationId } = req.body || {};
    if (!organizationId) {
      return badRequest(res, "organizationId puuttuu.");
    }
    const { rowCount } = await query(
      `SELECT 1
       FROM organization_memberships
       WHERE organization_id=$1 AND user_id=$2 AND left_at IS NULL`,
      [organizationId, token.userId]
    );
    if (rowCount === 0) {
      return res.status(403).json({ error: "Ei oikeuksia tähän organisaatioon." });
    }

    const projectRoles = await loadProjectRoles(token.userId, organizationId);
    const nextToken = encodeToken({
      userId: token.userId,
      organizationId,
      systemRole: token.systemRole || null,
      projectRoles,
    });
    res.json({ token: nextToken });
  } catch (err) {
    next(err);
  }
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
        "SELECT project_id, name, customer, project_state, project_details, created_at FROM projects ORDER BY created_at DESC"
      );
      res.json({ projects: rows });
      return;
    }

    const projectIds = Object.keys(user.projectRoles || {});
    if (projectIds.length === 0) {
      res.json({ projects: [] });
      return;
    }

    const { rows } = await query(
      "SELECT project_id, name, customer, project_state, project_details, created_at FROM projects WHERE project_id = ANY($1) ORDER BY created_at DESC",
      [projectIds]
    );
    res.json({ projects: rows });
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

app.get("/api/projects/:projectId/work-phases", async (req, res, next) => {
  try {
    if (!requireProjectAccess(req, res, req.params.projectId, "viewer")) {
      return;
    }
    const { projectId } = req.params;
    const { rows } = await query(
      `SELECT
         s.work_phase_id,
         s.work_phase_name AS name,
         s.work_phase_status AS status,
         p.owner,
         p.lead_littera_id,
         s.lead_littera_code,
         s.lead_littera_title,
         s.current_version_id,
         s.latest_baseline_id,
         s.target_import_batch_id,
         s.bac_total,
         s.latest_week_ending,
         s.percent_complete,
         s.ev_value,
         s.ghost_open_total,
         s.ac_total,
         s.ac_star_total,
         s.cpi
       FROM v_work_phase_summary_v16_all s
       JOIN work_phases p ON p.work_phase_id = s.work_phase_id
       WHERE s.project_id=$1
       ORDER BY s.work_phase_name`,
      [projectId]
    );
    res.json({ workPhases: rows });
  } catch (err) {
    next(err);
  }
});

app.get("/api/work-phases/:workPhaseId", async (req, res, next) => {
  try {
    const { workPhaseId } = req.params;
    const { rows } = await query(
      `SELECT
         s.project_id,
         s.work_phase_id,
         s.work_phase_name AS name,
         s.work_phase_status AS status,
         p.owner,
         p.lead_littera_id,
         s.lead_littera_code,
         s.lead_littera_title,
         s.current_version_id,
         s.latest_baseline_id,
         s.target_import_batch_id,
         s.bac_total,
         s.latest_week_ending,
         s.percent_complete,
         s.ev_value,
         s.ghost_open_total,
         s.ac_total,
         s.ac_star_total,
         s.cpi
       FROM v_work_phase_summary_v16_all s
       JOIN work_phases p ON p.work_phase_id = s.work_phase_id
       WHERE s.work_phase_id=$1`,
      [workPhaseId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Työvaihetta ei löytynyt." });
    }
    if (!requireProjectAccess(req, res, rows[0].project_id, "viewer")) {
      return;
    }
    const { project_id: _projectId, ...workPhase } = rows[0];
    res.json({ workPhase });
  } catch (err) {
    next(err);
  }
});

app.get("/api/work-phases/:workPhaseId/members", async (req, res, next) => {
  try {
    const { workPhaseId } = req.params;
    const { rows: phaseRows } = await query(
      `SELECT p.project_id, cv.work_phase_version_id
       FROM work_phases p
       LEFT JOIN v_work_phase_current_version cv ON cv.work_phase_id = p.work_phase_id
       WHERE p.work_phase_id=$1`,
      [workPhaseId]
    );
    if (phaseRows.length === 0) {
      return res.status(404).json({ error: "Työvaihetta ei löytynyt." });
    }
    if (!requireProjectAccess(req, res, phaseRows[0].project_id, "viewer")) {
      return;
    }
    const versionId = phaseRows[0].work_phase_version_id;
    if (!versionId) {
      return res.json({ members: [] });
    }
    const { rows } = await query(
      `SELECT
         m.work_phase_member_id,
         m.member_type,
         m.littera_id,
         l.code AS littera_code,
         l.title AS littera_title,
         m.item_code,
         m.item_desc,
         m.note,
         m.created_at,
         m.created_by
       FROM work_phase_members m
       LEFT JOIN litteras l
         ON l.project_id = m.project_id AND l.littera_id = m.littera_id
       WHERE m.work_phase_version_id=$1
       ORDER BY m.member_type, l.code, m.item_code`,
      [versionId]
    );
    res.json({ members: rows });
  } catch (err) {
    next(err);
  }
});

app.post("/api/work-phases/:workPhaseId/members", async (req, res, next) => {
  try {
    const { workPhaseId } = req.params;
    const { rows: phaseRows } = await query(
      `SELECT p.project_id, cv.work_phase_version_id, lb.work_phase_baseline_id
       FROM work_phases p
       LEFT JOIN v_work_phase_current_version cv ON cv.work_phase_id = p.work_phase_id
       LEFT JOIN v_work_phase_latest_baseline lb ON lb.work_phase_id = p.work_phase_id
       WHERE p.work_phase_id=$1`,
      [workPhaseId]
    );
    if (phaseRows.length === 0) {
      return res.status(404).json({ error: "Työvaihetta ei löytynyt." });
    }
    const phaseRow = phaseRows[0];
    if (!requireProjectAccess(req, res, phaseRow.project_id, "editor")) {
      return;
    }
    if (phaseRow.work_phase_baseline_id) {
      return res.status(409).json({ error: "BASELINE_ALREADY_LOCKED" });
    }
    if (!phaseRow.work_phase_version_id) {
      return res.status(409).json({ error: "VERSION_REQUIRED" });
    }

    const { memberType, litteraId, itemCode, itemDesc, note } = req.body || {};
    if (!memberType || !["LITTERA", "ITEM"].includes(memberType)) {
      return badRequest(res, "memberType puuttuu tai on virheellinen.");
    }
    if (memberType === "LITTERA" && !litteraId) {
      return badRequest(res, "litteraId puuttuu.");
    }
    if (memberType === "ITEM" && (!itemCode || String(itemCode).trim() === "")) {
      return badRequest(res, "itemCode puuttuu.");
    }

    const { rows: userRows } = await query(
      "SELECT username FROM users WHERE user_id=$1",
      [req.user?.userId]
    );
    const createdBy = userRows[0]?.username || "user";

    if (memberType === "LITTERA") {
      const { rowCount: litteraCount } = await query(
        "SELECT 1 FROM litteras WHERE project_id=$1 AND littera_id=$2",
        [phaseRow.project_id, litteraId]
      );
      if (litteraCount === 0) {
        return badRequest(res, "litteraId ei kuulu projektiin.");
      }
    }

    const { rows: existingRows } = await query(
      `SELECT 1
       FROM work_phase_members
       WHERE work_phase_version_id=$1
         AND member_type=$2
         AND (
           ($2 = 'LITTERA' AND littera_id=$3)
           OR ($2 = 'ITEM' AND item_code=$4)
         )`,
      [phaseRow.work_phase_version_id, memberType, litteraId || null, itemCode || null]
    );
    if (existingRows.length > 0) {
      return res.status(409).json({ error: "ALREADY_EXISTS" });
    }

    const { rows } = await query(
      `INSERT INTO work_phase_members (
         project_id,
         work_phase_version_id,
         member_type,
         littera_id,
         item_code,
         item_desc,
         note,
         created_by
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING work_phase_member_id`,
      [
        phaseRow.project_id,
        phaseRow.work_phase_version_id,
        memberType,
        memberType === "LITTERA" ? litteraId : null,
        memberType === "ITEM" ? String(itemCode).trim() : null,
        memberType === "ITEM" && itemDesc ? String(itemDesc).trim() : null,
        note ? String(note).trim() : null,
        createdBy,
      ]
    );
    res.status(201).json({ work_phase_member_id: rows[0].work_phase_member_id });
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

app.post("/api/work-phases/:workPhaseId/version", async (req, res, next) => {
  try {
    const { workPhaseId } = req.params;
    const { notes } = req.body || {};
    const { rows: phaseRows } = await query(
      "SELECT project_id FROM work_phases WHERE work_phase_id=$1",
      [workPhaseId]
    );
    if (phaseRows.length === 0) {
      return res.status(404).json({ error: "Työvaihetta ei löytynyt." });
    }
    const projectId = phaseRows[0].project_id;
    if (!requireProjectAccess(req, res, projectId, "editor")) {
      return;
    }
    const { rowCount: baselineCount } = await query(
      "SELECT 1 FROM v_work_phase_latest_baseline WHERE work_phase_id=$1",
      [workPhaseId]
    );
    if (baselineCount > 0) {
      return res.status(409).json({ error: "BASELINE_ALREADY_LOCKED" });
    }

    const { rows: userRows } = await query(
      "SELECT username FROM users WHERE user_id=$1",
      [req.user?.userId]
    );
    const createdBy = userRows[0]?.username || "user";

    await withClient(async (client) => {
      await client.query("BEGIN");
      try {
        const { rows: maxRows } = await client.query(
          "SELECT COALESCE(MAX(version_no), 0) AS max_version FROM work_phase_versions WHERE work_phase_id=$1",
          [workPhaseId]
        );
        const nextVersionNo = Number(maxRows[0]?.max_version || 0) + 1;

        const { rows: currentRows } = await client.query(
          "SELECT work_phase_version_id FROM v_work_phase_current_version WHERE work_phase_id=$1",
          [workPhaseId]
        );
        const sourceVersionId = currentRows[0]?.work_phase_version_id || null;

        await client.query(
          "UPDATE work_phase_versions SET status='RETIRED' WHERE work_phase_id=$1 AND status='ACTIVE'",
          [workPhaseId]
        );

        const { rows: insertRows } = await client.query(
          `INSERT INTO work_phase_versions
             (project_id, work_phase_id, version_no, status, notes, created_by)
           VALUES ($1,$2,$3,'ACTIVE',$4,$5)
           RETURNING work_phase_version_id`,
          [
            projectId,
            workPhaseId,
            nextVersionNo,
            notes ? String(notes).trim() : null,
            createdBy,
          ]
        );
        const newVersionId = insertRows[0].work_phase_version_id;

        if (sourceVersionId) {
          await client.query(
            `INSERT INTO work_phase_members (
               project_id,
               work_phase_version_id,
               member_type,
               littera_id,
               item_code,
               item_desc,
               note,
               created_by
             )
             SELECT
               project_id,
               $1,
               member_type,
               littera_id,
               item_code,
               item_desc,
               note,
               $2
             FROM work_phase_members
             WHERE work_phase_version_id=$3`,
            [newVersionId, createdBy, sourceVersionId]
          );
        }

        await client.query("COMMIT");
        res.status(201).json({ work_phase_version_id: newVersionId });
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    });
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

app.post("/api/import-staging/budget", async (req, res, next) => {
  try {
    if (!requireProjectAccess(req, res, req.body.projectId, "manager")) {
      return;
    }
    const { projectId, importedBy, filename, csvText } = req.body;
    if (!projectId) {
      return badRequest(res, "projectId puuttuu.");
    }
    if (!importedBy || String(importedBy).trim() === "") {
      return badRequest(res, "importedBy puuttuu.");
    }
    if (!csvText || String(csvText).trim() === "") {
      return badRequest(res, "CSV-teksti puuttuu.");
    }

    const safeName = filename ? String(filename).replace(/[^\w.\-]/g, "_") : "budget.csv";
    const signature = createHash("sha256").update(String(csvText)).digest("hex");
    const { headers, rows } = parseCsvRows(String(csvText), ";");
    if (headers.length === 0) {
      return badRequest(res, "CSV-otsikkorivi puuttuu.");
    }

    const headerMap = new Map(headers.map((h) => [String(h).trim().toLowerCase(), h]));
    const codeHeader = headerMap.get("litterakoodi");
    if (!codeHeader) {
      return badRequest(res, "CSV: Litterakoodi-sarake puuttuu.");
    }

    const budgetHeaders = [
      "Työ €",
      "Aine €",
      "Alih €",
      "Vmiehet €",
      "Muu €",
      "Summa",
    ].map((name) => headerMap.get(name.toLowerCase())).filter(Boolean);

    if (budgetHeaders.length === 0) {
      return badRequest(res, "CSV: kustannussarakkeet puuttuvat (Työ/Aine/Alih/Vmiehet/Muu/Summa).");
    }

    const warnings = [];
    const { rows: dupImportRows } = await query(
      `SELECT 1
       FROM import_batches
       WHERE project_id=$1 AND source_system='TARGET_ESTIMATE' AND signature=$2
       LIMIT 1`,
      [projectId, signature]
    );
    if (dupImportRows.length > 0) {
      warnings.push("Duplikaatti: sama signature on jo importoitu.");
    }
    const { rows: dupStagingRows } = await query(
      `SELECT 1
       FROM import_staging_batches
       WHERE project_id=$1 AND import_type='BUDGET' AND signature=$2
       LIMIT 1`,
      [projectId, signature]
    );
    if (dupStagingRows.length > 0) {
      warnings.push("Duplikaatti: sama signature on jo stagingissa.");
    }

    const result = await withClient(async (client) => {
      await client.query("BEGIN");
      try {
        const { rows: batchRows } = await client.query(
          `INSERT INTO import_staging_batches
           (project_id, import_type, source_system, file_name, signature, created_by)
           VALUES ($1, 'BUDGET', 'CSV', $2, $3, $4)
           RETURNING staging_batch_id`,
          [projectId, safeName, signature, String(importedBy).trim()]
        );
        const batchId = batchRows[0].staging_batch_id;

        await client.query(
          `INSERT INTO import_staging_batch_events
           (staging_batch_id, status, message, created_by)
           VALUES ($1, 'DRAFT', 'Staging luotu', $2)`,
          [batchId, String(importedBy).trim()]
        );

        let lineCount = 0;
        let issueCount = 0;

        for (let idx = 0; idx < rows.length; idx += 1) {
          const row = rows[idx];
          const raw = {};
          for (let i = 0; i < headers.length; i += 1) {
            raw[headers[i]] = row[i] !== undefined ? row[i] : "";
          }

          const rowNo = idx + 2;
          const { rows: lineRows } = await client.query(
            `INSERT INTO import_staging_lines_raw
             (staging_batch_id, row_no, raw_json, created_by)
             VALUES ($1, $2, $3, $4)
             RETURNING staging_line_id`,
            [batchId, rowNo, raw, String(importedBy).trim()]
          );
          lineCount += 1;

          const stagingLineId = lineRows[0].staging_line_id;
          const issues = [];

          const codeValue = String(raw[codeHeader] || "").trim();
          if (!codeValue) {
            issues.push({
              code: "MISSING_CODE",
              message: "Litterakoodi puuttuu.",
              severity: "ERROR",
            });
          } else if (!/^\d{4}$/.test(codeValue)) {
            issues.push({
              code: "INVALID_CODE",
              message: "Litterakoodi ei ole 4 numeroa.",
              severity: "ERROR",
            });
          }

          let hasBudgetValue = false;
          for (const header of budgetHeaders) {
            const rawValue = String(raw[header] || "").trim();
            if (!rawValue) {
              continue;
            }
            hasBudgetValue = true;
            const num = parseFiNumber(rawValue);
            if (num === null) {
              issues.push({
                code: "NON_NUMERIC",
                message: `${header} ei ole numero.`,
                severity: "ERROR",
              });
              continue;
            }
            if (num < 0) {
              issues.push({
                code: "NEGATIVE_VALUE",
                message: `${header} on negatiivinen.`,
                severity: "ERROR",
              });
            }
          }

          if (!hasBudgetValue) {
            issues.push({
              code: "MISSING_AMOUNT",
              message: "Kustannusarvo puuttuu.",
              severity: "ERROR",
            });
          }

          for (const issue of issues) {
            await client.query(
              `INSERT INTO import_staging_issues
               (staging_line_id, issue_code, issue_message, severity, created_by)
               VALUES ($1, $2, $3, $4, $5)`,
              [stagingLineId, issue.code, issue.message, issue.severity, String(importedBy).trim()]
            );
            issueCount += 1;
          }
        }

        await client.query("COMMIT");
        await logAppAudit({
          projectId,
          actor: String(importedBy).trim(),
          action: "import_staging.create",
          payload: { staging_batch_id: batchId, file_name: safeName, signature },
        });
        return { batchId, lineCount, issueCount };
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    });

    res.status(201).json({
      ok: true,
      staging_batch_id: result.batchId,
      line_count: result.lineCount,
      issue_count: result.issueCount,
      warnings,
    });
  } catch (err) {
    next(err);
  }
});

app.get("/api/import-staging", async (req, res, next) => {
  try {
    const projectId = req.query.projectId ? String(req.query.projectId).trim() : "";
    if (!projectId) {
      return badRequest(res, "projectId puuttuu.");
    }
    if (!requireProjectAccess(req, res, projectId, "manager")) {
      return;
    }
    const { rows } = await query(
      `SELECT b.staging_batch_id,
              b.project_id,
              b.import_type,
              b.source_system,
              b.file_name,
              b.signature,
              b.created_at,
              b.created_by,
              (
                SELECT status
                FROM import_staging_batch_events e
                WHERE e.staging_batch_id=b.staging_batch_id
                ORDER BY e.created_at DESC
                LIMIT 1
              ) AS status,
              (
                SELECT count(*)::int
                FROM import_staging_issues i
                JOIN import_staging_lines_raw l ON l.staging_line_id=i.staging_line_id
                WHERE l.staging_batch_id=b.staging_batch_id
              ) AS issue_count
       FROM import_staging_batches b
       WHERE b.project_id=$1
       ORDER BY b.created_at DESC`,
      [projectId]
    );
    res.json({ ok: true, batches: rows });
  } catch (err) {
    next(err);
  }
});

app.get("/api/import-staging/:batchId/issues", async (req, res, next) => {
  try {
    const { batchId } = req.params;
    if (!batchId) {
      return badRequest(res, "batchId puuttuu.");
    }
    const { rows: batchRows } = await query(
      "SELECT project_id FROM import_staging_batches WHERE staging_batch_id=$1",
      [batchId]
    );
    if (batchRows.length === 0) {
      return res.status(404).json({ error: "Staging-batchia ei loydy." });
    }
    const projectId = batchRows[0].project_id;
    if (!requireProjectAccess(req, res, projectId, "manager")) {
      return;
    }

    const { rows } = await query(
      `SELECT i.staging_issue_id,
              i.issue_code,
              i.issue_message,
              i.severity,
              i.created_at,
              l.staging_line_id,
              l.row_no,
              l.raw_json
       FROM import_staging_issues i
       JOIN import_staging_lines_raw l ON l.staging_line_id=i.staging_line_id
       WHERE l.staging_batch_id=$1
       ORDER BY l.row_no ASC, i.created_at ASC`,
      [batchId]
    );

    res.json({ ok: true, issues: rows });
  } catch (err) {
    next(err);
  }
});

app.get("/api/import-staging/:batchId/lines", async (req, res, next) => {
  try {
    const { batchId } = req.params;
    const mode = req.query.mode ? String(req.query.mode).toLowerCase() : "issues";
    const severity = req.query.severity ? String(req.query.severity).toUpperCase() : null;
    if (!batchId) {
      return badRequest(res, "batchId puuttuu.");
    }
    const { rows: batchRows } = await query(
      "SELECT project_id FROM import_staging_batches WHERE staging_batch_id=$1",
      [batchId]
    );
    if (batchRows.length === 0) {
      return res.status(404).json({ error: "Staging-batchia ei loydy." });
    }
    const projectId = batchRows[0].project_id;
    if (!requireProjectAccess(req, res, projectId, "manager")) {
      return;
    }

    const { rows: lineRows } = await query(
      `SELECT l.staging_line_id,
              l.row_no,
              l.raw_json,
              (
                SELECT e.edit_json
                FROM import_staging_line_edits e
                WHERE e.staging_line_id=l.staging_line_id
                ORDER BY e.edited_at DESC
                LIMIT 1
              ) AS edit_json
       FROM import_staging_lines_raw l
       WHERE l.staging_batch_id=$1
       ORDER BY l.row_no ASC`,
      [batchId]
    );

    const { rows: issueLineRowsAll } = await query(
      `SELECT DISTINCT l.staging_line_id
       FROM import_staging_issues i
       JOIN import_staging_lines_raw l ON l.staging_line_id=i.staging_line_id
       WHERE l.staging_batch_id=$1`,
      [batchId]
    );
    const issueLineIdsAll = new Set(issueLineRowsAll.map((row) => row.staging_line_id));

    const issueParams = [batchId];
    let severitySql = "";
    if (severity) {
      issueParams.push(severity);
      severitySql = " AND i.severity=$2";
    }

    const { rows: issueRows } = await query(
      `SELECT i.staging_line_id,
              i.issue_code,
              i.issue_message,
              i.severity,
              i.created_at
       FROM import_staging_issues i
       JOIN import_staging_lines_raw l ON l.staging_line_id=i.staging_line_id
       WHERE l.staging_batch_id=$1${severitySql}
       ORDER BY l.row_no ASC, i.created_at ASC`,
      issueParams
    );

    const issuesByLine = new Map();
    for (const issue of issueRows) {
      if (!issuesByLine.has(issue.staging_line_id)) {
        issuesByLine.set(issue.staging_line_id, []);
      }
      issuesByLine.get(issue.staging_line_id).push(issue);
    }

    const filtered = lineRows.filter((line) => {
      if (mode === "all") {
        return true;
      }
      if (mode === "clean") {
        return !issueLineIdsAll.has(line.staging_line_id);
      }
      return issuesByLine.has(line.staging_line_id);
    });

    const lines = filtered.map((line) => ({
      staging_line_id: line.staging_line_id,
      row_no: line.row_no,
      raw_json: line.raw_json,
      edit_json: line.edit_json,
      issues: issuesByLine.get(line.staging_line_id) || [],
    }));

    res.json({ ok: true, lines });
  } catch (err) {
    next(err);
  }
});

app.post("/api/import-staging/lines/:lineId/edits", async (req, res, next) => {
  try {
    const { lineId } = req.params;
    const { editedBy, edit, reason } = req.body;
    if (!lineId) {
      return badRequest(res, "lineId puuttuu.");
    }
    if (!editedBy || String(editedBy).trim() === "") {
      return badRequest(res, "editedBy puuttuu.");
    }
    if (!edit || typeof edit !== "object") {
      return badRequest(res, "edit puuttuu tai on virheellinen.");
    }

    const { rows: lineRows } = await query(
      `SELECT b.project_id
       FROM import_staging_lines_raw l
       JOIN import_staging_batches b ON b.staging_batch_id=l.staging_batch_id
       WHERE l.staging_line_id=$1`,
      [lineId]
    );
    if (lineRows.length === 0) {
      return res.status(404).json({ error: "Staging-rivia ei loydy." });
    }
    const projectId = lineRows[0].project_id;
    if (!requireProjectAccess(req, res, projectId, "manager")) {
      return;
    }

    const { rows } = await query(
      `INSERT INTO import_staging_line_edits
       (staging_line_id, edit_json, reason, edited_by)
       VALUES ($1, $2, $3, $4)
       RETURNING staging_line_edit_id`,
      [lineId, edit, reason ? String(reason).trim() : null, String(editedBy).trim()]
    );
    await logAppAudit({
      projectId,
      actor: String(editedBy).trim(),
      action: "import_staging.edit",
      payload: {
        staging_line_id: lineId,
        reason: reason ? String(reason).trim() : null,
        edit,
      },
    });
    res.status(201).json({ ok: true, staging_line_edit_id: rows[0].staging_line_edit_id });
  } catch (err) {
    next(err);
  }
});

app.post("/api/import-staging/:batchId/approve", async (req, res, next) => {
  try {
    const { batchId } = req.params;
    const { approvedBy, message } = req.body;
    if (!batchId) {
      return badRequest(res, "batchId puuttuu.");
    }
    if (!approvedBy || String(approvedBy).trim() === "") {
      return badRequest(res, "approvedBy puuttuu.");
    }

    const { rows: batchRows } = await query(
      "SELECT project_id FROM import_staging_batches WHERE staging_batch_id=$1",
      [batchId]
    );
    if (batchRows.length === 0) {
      return res.status(404).json({ error: "Staging-batchia ei loydy." });
    }
    const projectId = batchRows[0].project_id;
    if (!requireProjectAccess(req, res, projectId, "manager")) {
      return;
    }

    const { rows } = await query(
      `INSERT INTO import_staging_batch_events
       (staging_batch_id, status, message, created_by)
       VALUES ($1, 'APPROVED', $2, $3)
       RETURNING staging_batch_event_id`,
      [batchId, message ? String(message).trim() : "Hyvaksytty", String(approvedBy).trim()]
    );
    await logAppAudit({
      projectId,
      actor: String(approvedBy).trim(),
      action: "import_staging.approve",
      payload: { staging_batch_id: batchId, message: message ? String(message).trim() : "Hyvaksytty" },
    });
    res.status(201).json({ ok: true, staging_batch_event_id: rows[0].staging_batch_event_id });
  } catch (err) {
    next(err);
  }
});

app.post("/api/import-staging/:batchId/reject", async (req, res, next) => {
  try {
    const { batchId } = req.params;
    const { rejectedBy, message } = req.body;
    if (!batchId) {
      return badRequest(res, "batchId puuttuu.");
    }
    if (!rejectedBy || String(rejectedBy).trim() === "") {
      return badRequest(res, "rejectedBy puuttuu.");
    }

    const { rows: batchRows } = await query(
      "SELECT project_id FROM import_staging_batches WHERE staging_batch_id=$1",
      [batchId]
    );
    if (batchRows.length === 0) {
      return res.status(404).json({ error: "Staging-batchia ei loydy." });
    }
    const projectId = batchRows[0].project_id;
    if (!requireProjectAccess(req, res, projectId, "manager")) {
      return;
    }

    const { rows } = await query(
      `INSERT INTO import_staging_batch_events
       (staging_batch_id, status, message, created_by)
       VALUES ($1, 'REJECTED', $2, $3)
       RETURNING staging_batch_event_id`,
      [batchId, message ? String(message).trim() : "Hylatty", String(rejectedBy).trim()]
    );
    await logAppAudit({
      projectId,
      actor: String(rejectedBy).trim(),
      action: "import_staging.reject",
      payload: { staging_batch_id: batchId, message: message ? String(message).trim() : "Hylatty" },
    });
    res.status(201).json({ ok: true, staging_batch_event_id: rows[0].staging_batch_event_id });
  } catch (err) {
    next(err);
  }
});

app.post("/api/import-staging/:batchId/commit", async (req, res, next) => {
  try {
    const { batchId } = req.params;
    const { committedBy, message, allowDuplicate, force } = req.body;
    if (!batchId) {
      return badRequest(res, "batchId puuttuu.");
    }
    if (!committedBy || String(committedBy).trim() === "") {
      return badRequest(res, "committedBy puuttuu.");
    }

    const { rows: batchRows } = await query(
      `SELECT staging_batch_id, project_id, import_type, signature, file_name
       FROM import_staging_batches
       WHERE staging_batch_id=$1`,
      [batchId]
    );
    if (batchRows.length === 0) {
      return res.status(404).json({ error: "Staging-batchia ei loydy." });
    }
    const batch = batchRows[0];
    if (!requireProjectAccess(req, res, batch.project_id, "manager")) {
      return;
    }
    if (String(batch.import_type).toUpperCase() !== "BUDGET") {
      return badRequest(res, "Vain BUDGET staging voidaan siirtaa.");
    }

    const { rows: statusRows } = await query(
      `SELECT status
       FROM import_staging_batch_events
       WHERE staging_batch_id=$1
       ORDER BY created_at DESC
       LIMIT 1`,
      [batchId]
    );
    const latestStatus = statusRows[0]?.status || null;
    if (latestStatus !== "APPROVED") {
      return badRequest(res, "Staging-batch ei ole hyvaksytty.");
    }

    const { rows: issueRows } = await query(
      `SELECT count(*)::int AS cnt
       FROM import_staging_issues i
       JOIN import_staging_lines_raw l ON l.staging_line_id=i.staging_line_id
       WHERE l.staging_batch_id=$1 AND i.severity='ERROR'`,
      [batchId]
    );
    const errorCount = issueRows[0]?.cnt || 0;
    if (errorCount > 0 && !force) {
      return badRequest(res, "Staging-batchissa on ERROR-issueita. Korjaa tai kayta force=true.");
    }

    const { rows: lineRows } = await query(
      `SELECT l.staging_line_id,
              l.row_no,
              l.raw_json,
              (
                SELECT e.edit_json
                FROM import_staging_line_edits e
                WHERE e.staging_line_id=l.staging_line_id
                ORDER BY e.edited_at DESC
                LIMIT 1
              ) AS edit_json
       FROM import_staging_lines_raw l
       WHERE l.staging_batch_id=$1
       ORDER BY l.row_no ASC`,
      [batchId]
    );
    if (lineRows.length === 0) {
      return badRequest(res, "Staging-batchissa ei ole riveja.");
    }

    const headers = Object.keys(lineRows[0].raw_json || {});
    const headerLookup = buildHeaderLookup(headers);
    const codeHeader = headerLookup.get("litterakoodi");
    const titleHeader = headerLookup.get("litteraselite");
    if (!codeHeader) {
      return badRequest(res, "CSV: Litterakoodi-sarake puuttuu.");
    }

    const { activeCostHeaders } = selectActiveCostHeaders(headerLookup);

    if (activeCostHeaders.length === 0) {
      return badRequest(res, "CSV: kustannussarakkeet puuttuvat (Työ/Aine/Alih/Vmiehet/Muu/Summa).");
    }

    const aggregates = computeBudgetAggregates({
      lines: lineRows,
      codeHeader,
      titleHeader,
      activeCostHeaders,
      issueLineIds: new Set(),
    });

    if (aggregates.totalsByCodeTypeAll.size === 0) {
      return badRequest(res, "Ei kelvollisia kustannusriveja siirtoon.");
    }

    const result = await withClient(async (client) => {
      await client.query("BEGIN");
      try {
        if (!allowDuplicate && batch.signature) {
          const { rows: dupRows } = await client.query(
            `SELECT 1
             FROM import_batches
             WHERE project_id=$1 AND source_system='TARGET_ESTIMATE' AND signature=$2
             LIMIT 1`,
            [batch.project_id, batch.signature]
          );
          if (dupRows.length > 0) {
            throw new Error("Tama tiedosto on jo importattu (signature).");
          }
        }

        const codes = [...aggregates.codes.values()];
        for (const code of codes) {
          const title = aggregates.titlesByCode.get(code) || null;
          const groupCode = groupCodeFromLittera(code);
          await client.query(
            `INSERT INTO litteras (project_id, code, title, group_code)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (project_id, code) DO NOTHING`,
            [batch.project_id, code, title, groupCode]
          );
        }

        const { rows: litteraRows } = await client.query(
          `SELECT code, littera_id
           FROM litteras
           WHERE project_id=$1 AND code = ANY($2)`,
          [batch.project_id, codes]
        );
        const litteraByCode = new Map(litteraRows.map((r) => [r.code, r.littera_id]));

        const notes = `Staging commit: ${batch.file_name || "budget.csv"}`;
        const { rows: batchInsertRows } = await client.query(
          `INSERT INTO import_batches
           (project_id, source_system, imported_by, signature, notes)
           VALUES ($1, 'TARGET_ESTIMATE', $2, $3, $4)
           RETURNING import_batch_id`,
          [batch.project_id, String(committedBy).trim(), batch.signature || null, notes]
        );
        const importBatchId = batchInsertRows[0].import_batch_id;

        let inserted = 0;
        for (const [key, amount] of aggregates.totalsByCodeTypeAll.entries()) {
          const [code, costType] = key.split(":");
          const litteraId = litteraByCode.get(code);
          if (!litteraId) {
            continue;
          }
          await client.query(
            `INSERT INTO budget_lines
             (project_id, target_littera_id, cost_type, amount, source, import_batch_id, created_by)
             VALUES ($1, $2, $3::cost_type, $4, 'IMPORT'::budget_source, $5, $6)`,
            [
              batch.project_id,
              litteraId,
              costType,
              amount,
              importBatchId,
              String(committedBy).trim(),
            ]
          );
          inserted += 1;
        }

        await client.query(
          `INSERT INTO import_staging_batch_events
           (staging_batch_id, status, message, created_by)
           VALUES ($1, 'COMMITTED', $2, $3)`,
          [batchId, message ? String(message).trim() : "Siirretty budget_lines-tauluun", String(committedBy).trim()]
        );
        await client.query(
          "INSERT INTO app_audit_log (project_id, actor, action, payload) VALUES ($1,$2,$3,$4)",
          [
            batch.project_id,
            String(committedBy).trim(),
            "import_staging.commit",
            {
              staging_batch_id: batchId,
              import_batch_id: importBatchId,
              inserted_rows: inserted,
              message: message ? String(message).trim() : "Siirretty budget_lines-tauluun",
            },
          ]
        );

        await client.query("COMMIT");
        return { importBatchId, inserted };
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    });

    res.status(201).json({
      ok: true,
      import_batch_id: result.importBatchId,
      inserted_rows: result.inserted,
      skipped_rows: aggregates.skippedRows,
      skipped_values: aggregates.skippedValues,
      error_issues: errorCount,
    });
  } catch (err) {
    next(err);
  }
});

app.get("/api/import-staging/:batchId/summary", async (req, res, next) => {
  try {
    const { batchId } = req.params;
    if (!batchId) {
      return badRequest(res, "batchId puuttuu.");
    }
    const { rows: batchRows } = await query(
      `SELECT staging_batch_id, project_id, import_type
       FROM import_staging_batches
       WHERE staging_batch_id=$1`,
      [batchId]
    );
    if (batchRows.length === 0) {
      return res.status(404).json({ error: "Staging-batchia ei loydy." });
    }
    const batch = batchRows[0];
    if (!requireProjectAccess(req, res, batch.project_id, "manager")) {
      return;
    }
    if (String(batch.import_type).toUpperCase() !== "BUDGET") {
      return badRequest(res, "Vain BUDGET staging voidaan esikatsella.");
    }

    const { rows: issueRows } = await query(
      `SELECT count(*)::int AS cnt
       FROM import_staging_issues i
       JOIN import_staging_lines_raw l ON l.staging_line_id=i.staging_line_id
       WHERE l.staging_batch_id=$1 AND i.severity='ERROR'`,
      [batchId]
    );
    const errorCount = issueRows[0]?.cnt || 0;

    const { rows: issueLineRows } = await query(
      `SELECT DISTINCT l.staging_line_id
       FROM import_staging_issues i
       JOIN import_staging_lines_raw l ON l.staging_line_id=i.staging_line_id
       WHERE l.staging_batch_id=$1`,
      [batchId]
    );
    const issueLineIds = new Set(issueLineRows.map((row) => row.staging_line_id));

    const { rows: lineRows } = await query(
      `SELECT l.staging_line_id,
              l.row_no,
              l.raw_json,
              (
                SELECT e.edit_json
                FROM import_staging_line_edits e
                WHERE e.staging_line_id=l.staging_line_id
                ORDER BY e.edited_at DESC
                LIMIT 1
              ) AS edit_json
       FROM import_staging_lines_raw l
       WHERE l.staging_batch_id=$1
       ORDER BY l.row_no ASC`,
      [batchId]
    );
    if (lineRows.length === 0) {
      return badRequest(res, "Staging-batchissa ei ole riveja.");
    }

    const headers = Object.keys(lineRows[0].raw_json || {});
    const headerLookup = buildHeaderLookup(headers);
    const codeHeader = headerLookup.get("litterakoodi");
    const titleHeader = headerLookup.get("litteraselite");
    if (!codeHeader) {
      return badRequest(res, "CSV: Litterakoodi-sarake puuttuu.");
    }

    const { activeCostHeaders } = selectActiveCostHeaders(headerLookup);

    if (activeCostHeaders.length === 0) {
      return badRequest(res, "CSV: kustannussarakkeet puuttuvat (Työ/Aine/Alih/Vmiehet/Muu/Summa).");
    }

    const aggregates = computeBudgetAggregates({
      lines: lineRows,
      codeHeader,
      titleHeader,
      activeCostHeaders,
      issueLineIds,
    });

    const totalsByCostType = {};
    for (const [key, value] of aggregates.totalsByCostTypeClean.entries()) {
      totalsByCostType[key] = value;
    }
    const totalsByCostTypeAll = {};
    for (const [key, value] of aggregates.totalsByCostTypeAll.entries()) {
      totalsByCostTypeAll[key] = value;
    }

    const topCodes = [...aggregates.totalsByCodeClean.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([code, total]) => ({
        code,
        title: aggregates.titlesByCode.get(code) || null,
        total,
      }));
    const topLines = [...aggregates.totalsByCodeTypeClean.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key, total]) => {
        const [code, costType] = key.split(":");
        return {
          code,
          title: aggregates.titlesByCode.get(code) || null,
          cost_type: costType,
          total,
        };
      });

    res.json({
      ok: true,
      staging_batch_id: batchId,
      line_count: lineRows.length,
      skipped_rows: aggregates.skippedRows,
      skipped_values: aggregates.skippedValues,
      error_issues: errorCount,
      codes_count: aggregates.codes.size,
      totals_by_cost_type: totalsByCostType,
      totals_by_cost_type_all: totalsByCostTypeAll,
      top_codes: topCodes,
      top_lines: topLines,
    });
  } catch (err) {
    next(err);
  }
});

app.get("/api/import-staging/:batchId/export", async (req, res, next) => {
  try {
    const { batchId } = req.params;
    const mode = req.query.mode ? String(req.query.mode).toLowerCase() : "clean";
    if (!batchId) {
      return badRequest(res, "batchId puuttuu.");
    }
    if (!["clean", "all"].includes(mode)) {
      return badRequest(res, "mode on virheellinen (clean|all).");
    }

    const { rows: batchRows } = await query(
      `SELECT staging_batch_id, project_id, import_type
       FROM import_staging_batches
       WHERE staging_batch_id=$1`,
      [batchId]
    );
    if (batchRows.length === 0) {
      return res.status(404).json({ error: "Staging-batchia ei loydy." });
    }
    const batch = batchRows[0];
    if (!requireProjectAccess(req, res, batch.project_id, "manager")) {
      return;
    }
    if (String(batch.import_type).toUpperCase() !== "BUDGET") {
      return badRequest(res, "Vain BUDGET staging voidaan exportata.");
    }

    const { rows: lineRows } = await query(
      `SELECT l.staging_line_id,
              l.row_no,
              l.raw_json,
              (
                SELECT e.edit_json
                FROM import_staging_line_edits e
                WHERE e.staging_line_id=l.staging_line_id
                ORDER BY e.edited_at DESC
                LIMIT 1
              ) AS edit_json
       FROM import_staging_lines_raw l
       WHERE l.staging_batch_id=$1
       ORDER BY l.row_no ASC`,
      [batchId]
    );
    if (lineRows.length === 0) {
      return badRequest(res, "Staging-batchissa ei ole riveja.");
    }

    let issueLineIds = new Set();
    if (mode === "clean") {
      const { rows: issueLineRows } = await query(
        `SELECT DISTINCT l.staging_line_id
         FROM import_staging_issues i
         JOIN import_staging_lines_raw l ON l.staging_line_id=i.staging_line_id
         WHERE l.staging_batch_id=$1`,
        [batchId]
      );
      issueLineIds = new Set(issueLineRows.map((row) => row.staging_line_id));
    }

    const headers = Object.keys(lineRows[0].raw_json || {});
    const headerLookup = buildHeaderLookup(headers);
    const codeHeader = headerLookup.get("litterakoodi");
    const titleHeader = headerLookup.get("litteraselite");
    if (!codeHeader) {
      return badRequest(res, "CSV: Litterakoodi-sarake puuttuu.");
    }

    const { activeCostHeaders } = selectActiveCostHeaders(headerLookup);
    if (activeCostHeaders.length === 0) {
      return badRequest(res, "CSV: kustannussarakkeet puuttuvat (Työ/Aine/Alih/Vmiehet/Muu/Summa).");
    }

    const aggregates = computeBudgetAggregates({
      lines: lineRows,
      codeHeader,
      titleHeader,
      activeCostHeaders,
      issueLineIds,
    });

    const totalsMap =
      mode === "clean" ? aggregates.totalsByCodeTypeClean : aggregates.totalsByCodeTypeAll;

    if (totalsMap.size === 0) {
      return badRequest(res, "Ei kelvollisia riveja exportiin.");
    }

    const perCode = new Map();
    for (const [key, amount] of totalsMap.entries()) {
      const [code, costType] = key.split(":");
      if (!perCode.has(code)) {
        perCode.set(code, { LABOR: 0, MATERIAL: 0, SUBCONTRACT: 0, RENTAL: 0, OTHER: 0 });
      }
      perCode.get(code)[costType] = amount;
    }

    const header = [
      "Litterakoodi",
      "Litteraselite",
      "Työ €",
      "Aine €",
      "Alih €",
      "Vmiehet €",
      "Muu €",
    ];
    const lines = [header.join(";")];
    const codes = [...perCode.keys()].sort();
    for (const code of codes) {
      const title = aggregates.titlesByCode.get(code) || "";
      const row = perCode.get(code);
      lines.push(
        [
          code,
          title,
          row.LABOR || 0,
          row.MATERIAL || 0,
          row.SUBCONTRACT || 0,
          row.RENTAL || 0,
          row.OTHER || 0,
        ]
          .map((value) => csvEscape(value, ";"))
          .join(";")
      );
    }

    res.type("text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=\"staging-${batchId}-${mode}.csv\"`
    );
    res.send(lines.join("\n") + "\n");
  } catch (err) {
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
    const importType = normalizeImportType(type);
    if (!importType) {
      return badRequest(res, "Tuntematon import-tyyppi.");
    }
    if (!requireProjectAccess(req, res, projectId, "manager")) {
      return;
    }
    const { rows } = await query(
      `SELECT mapping, updated_at, created_by
       FROM import_mappings
       WHERE project_id=$1 AND import_type=$2`,
      [projectId, importType]
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
    const importType = normalizeImportType(type);
    if (!importType) {
      return badRequest(res, "Tuntematon import-tyyppi.");
    }
    const validationError =
      importType === "BUDGET"
        ? validateBudgetImportMapping(mapping)
        : validateJydaImportMapping(mapping);
    if (validationError) {
      return badRequest(res, validationError);
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
      [projectId, importType, mapping, String(createdBy).trim()]
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

    const planningStatusResult = await query(
      `SELECT status
       FROM v_planning_current
       WHERE project_id=$1 AND target_littera_id=$2`,
      [projectId, targetLitteraId]
    );
    const planningStatus = planningStatusResult.rows[0]?.status || null;
    if (!["READY_FOR_FORECAST", "LOCKED"].includes(planningStatus)) {
      return res.status(409).json({
        error: "Suunnitelma ei ole valmis ennustetapahtumaan.",
        detail: `Suunnitelman status: ${planningStatus || "PUUTTUU"}`,
      });
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
            "SNAPSHOT",
            reportSnapshotUri(checksum),
            checksum,
          ]
        );
        await insertReportPackageSnapshots(client, {
          packageId: rows[0].package_id,
          projectId,
          month,
        });
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
              "SNAPSHOT",
              reportSnapshotUri(checksum),
              checksum,
              correctionId,
            ]
          );
          await insertReportPackageSnapshots(client, {
            packageId: pkgRows[0].package_id,
            projectId,
            month,
          });
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
      `SELECT package_id, project_id, month, artifact_type, artifact_uri, checksum
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
    const row = rows[0];
    const { rows: snapshotRows } = await query(
      `SELECT row_data
       FROM report_package_snapshots
       WHERE package_id=$1
       ORDER BY snapshot_id`,
      [packageId]
    );
    const snapshots = snapshotRows.map((snap) => snap.row_data);
    const files = snapshots.length > 0 ? ["report.pdf", "report.csv"] : [];
    const requestedFile = req.query.file ? String(req.query.file) : "";

    if (requestedFile) {
      if (snapshots.length === 0) {
        return res.status(409).json({ error: "Snapshot puuttuu." });
      }
      if (requestedFile === "report.pdf") {
        res.type("application/pdf");
        const doc = buildReportPdf({
          projectId: row.project_id,
          month: row.month,
          checksum: row.checksum,
          rows: snapshots,
        });
        doc.pipe(res);
        doc.end();
        return;
      }
      if (requestedFile === "report.csv") {
        res.type("text/csv");
        res.send(formatSnapshotCsv(snapshots));
        return;
      }
      return res.status(404).json({ error: "Tiedostoa ei löytynyt." });
    }

    res.json({ ...row, files });
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

app.get("/api/report/main-groups", async (req, res, next) => {
  try {
    if (!requireProjectAccess(req, res, req.query.projectId, "viewer")) {
      return;
    }
    const { projectId } = req.query;
    if (!projectId) {
      return badRequest(res, "projectId puuttuu.");
    }

    const { rows } = await query(
      `SELECT main_group_code, budget_total, actual_total, variance_eur
       FROM v_report_project_main_group_current
       WHERE project_id=$1
       ORDER BY main_group_code`,
      [projectId]
    );

    res.json({ rows });
  } catch (err) {
    next(err);
  }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Palvelinvirhe", detail: err.message });
});

app.get(
  [
    "/",
    "/setup",
    "/sales",
    "/mapping",
    "/planning",
    "/weekly",
    "/forecast",
    "/report",
    "/history",
  ],
  (_req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
  }
);

app.listen(port, () => {
  console.log(`MVP API/UI: http://localhost:${port}`);
});
