import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";
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

const SYSTEM_ROLES = ["superadmin", "admin", "director"];
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

async function logImportJobEvent({ jobId, status, message }) {
  await query(
    "INSERT INTO import_job_events (import_job_id, status, message) VALUES ($1,$2,$3)",
    [jobId, status, message || null]
  );
}

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
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
      `SELECT planning_event_id, event_time, created_by, status, summary, observations, risks, decisions
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
    } = req.body;

    if (!projectId || !targetLitteraId) {
      return badRequest(res, "projectId ja targetLitteraId puuttuu.");
    }
    if (!createdBy || String(createdBy).trim() === "") {
      return badRequest(res, "createdBy puuttuu.");
    }

    const { rows } = await query(
      `INSERT INTO planning_events
        (project_id, target_littera_id, created_by, status, summary, observations, risks, decisions)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
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

      await client.query("COMMIT");
      return forecastEventId;
    });

    res.status(201).json({ forecast_event_id: result });
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
  ["/", "/setup", "/mapping", "/planning", "/forecast", "/report", "/history"],
  (_req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
  }
);

app.listen(port, () => {
  console.log(`MVP API/UI: http://localhost:${port}`);
});
