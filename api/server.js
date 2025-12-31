const path = require('path');
const express = require('express');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();
app.use(express.json());

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://codex:codex@db:5432/codex';
const JWT_SECRET = process.env.JWT_SECRET;
const APP_VERSION = process.env.APP_VERSION || '0.1.0';
const NODE_ENV = process.env.NODE_ENV || 'development';
const ALLOW_CROSS_ORG_QUERY = process.env.ALLOW_CROSS_ORG_QUERY === 'true';
const PIN_SALT = process.env.PIN_SALT || 'dev-salt';

if (!JWT_SECRET && NODE_ENV !== 'development') {
  throw new Error('JWT_SECRET is required');
}

const jwtSecret = JWT_SECRET || require('crypto').randomBytes(32).toString('hex');
if (!JWT_SECRET) {
  console.warn('JWT_SECRET missing; using ephemeral secret (development only).');
}

const pool = new Pool({ connectionString: DATABASE_URL });

function getAuthUser(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return null;
  }
  const token = header.slice('Bearer '.length);
  try {
    return jwt.verify(token, jwtSecret);
  } catch (error) {
    return null;
  }
}

function requireAuth(req, res, next) {
  const publicApiPaths = new Set(['/login', '/users', '/terminology/dictionary']);
  const user = getAuthUser(req);
  if (publicApiPaths.has(req.path)) {
    if (user) {
      req.user = user;
    }
    return next();
  }
  if (!user) {
    return res.status(401).json({ error: 'AUTH_REQUIRED' });
  }
  req.user = user;
  return next();
}

async function ensureProjectAccessByUserId(projectId, userId) {
  const result = await pool.query(
    `SELECT 1
     FROM projects p
     JOIN organizations o ON o.organization_id = p.organization_id
     JOIN organization_memberships m
       ON m.organization_id = o.organization_id
      AND m.left_at IS NULL
     WHERE p.project_id = $1
       AND m.user_id = $2`,
    [projectId, userId]
  );
  return result.rowCount > 0;
}

async function ensureOrgAccessByUserId(organizationId, userId) {
  const result = await pool.query(
    `SELECT 1
     FROM organizations o
     JOIN organization_memberships m
       ON m.organization_id = o.organization_id
      AND m.left_at IS NULL
     WHERE o.organization_id = $1
       AND m.user_id = $2`,
    [organizationId, userId]
  );
  return result.rowCount > 0;
}

async function requireProjectAccess(req, res, next) {
  const projectId = req.params.projectId || req.body.projectId;
  if (!projectId) {
    return res.status(400).json({ error: 'PROJECT_ID_REQUIRED' });
  }
  const hasAccess = await ensureProjectAccessByUserId(projectId, req.user.user_id);
  if (!hasAccess) {
    return res.status(403).json({ error: 'PROJECT_FORBIDDEN' });
  }
  return next();
}

async function hasPermission(projectId, username, permissionCode) {
  const result = await pool.query(
    'SELECT rbac_user_has_permission($1, $2, $3) AS allowed',
    [projectId, username, permissionCode]
  );
  return result.rows[0]?.allowed === true;
}

async function requirePermission(projectId, username, permissionCode, res) {
  const allowed = await hasPermission(projectId, username, permissionCode);
  if (!allowed) {
    res.status(403).json({ error: 'NO_PERMISSION', permission: permissionCode });
    return false;
  }
  return true;
}

async function getWorkPhaseContext(workPhaseId) {
  const result = await pool.query(
    `SELECT project_id, work_phase_id, latest_baseline_id
     FROM v_work_phase_summary_mvp
     WHERE work_phase_id = $1`,
    [workPhaseId]
  );
  if (result.rowCount === 0) {
    return null;
  }
  return result.rows[0];
}

function requireSetupState(context, res) {
  if (context.latest_baseline_id) {
    res.status(409).json({ error: 'BASELINE_ALREADY_LOCKED' });
    return false;
  }
  return true;
}

function requireTrackState(context, res) {
  if (!context.latest_baseline_id) {
    res.status(409).json({ error: 'BASELINE_REQUIRED' });
    return false;
  }
  return true;
}

function requireBodyFields(fields, req, res) {
  for (const field of fields) {
    if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
      res.status(400).json({ error: 'FIELD_REQUIRED', field });
      return false;
    }
  }
  return true;
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/version', (req, res) => {
  res.json({ version: APP_VERSION });
});

app.use('/api', requireAuth);

app.post('/api/login', async (req, res) => {
  if (!requireBodyFields(['username', 'pin'], req, res)) {
    return;
  }
  const { username, pin } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  if (!app.locals.loginAttempts) {
    app.locals.loginAttempts = new Map();
  }
  const attempts = app.locals.loginAttempts;
  const entry = attempts.get(ip) || { count: 0, resetAt: now + 60_000 };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + 60_000;
  }
  entry.count += 1;
  attempts.set(ip, entry);
  if (entry.count > 10) {
    return res.status(429).json({ error: 'RATE_LIMITED' });
  }
  const result = await pool.query(
    'SELECT user_id, username, display_name, pin_hash FROM users WHERE username = $1 AND is_active = true',
    [username]
  );
  if (result.rowCount === 0) {
    return res.status(401).json({ error: 'INVALID_USER' });
  }
  const user = result.rows[0];
  const pinHash = require('crypto')
    .createHash('sha256')
    .update(`${pin}${PIN_SALT}`)
    .digest('hex');
  if (!user.pin_hash || user.pin_hash !== pinHash) {
    return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
  }
  const orgsResult = await pool.query(
    `SELECT o.organization_id
     FROM organizations o
     JOIN organization_memberships m
       ON m.organization_id = o.organization_id
      AND m.left_at IS NULL
     WHERE m.user_id = $1
     ORDER BY o.name`,
    [user.user_id]
  );
  const activeOrgId = orgsResult.rows[0]?.organization_id || null;
  const token = jwt.sign(
    { username: user.username, user_id: user.user_id, organization_id: activeOrgId },
    jwtSecret,
    { expiresIn: '12h' }
  );
  return res.json({ token, user: { username: user.username, display_name: user.display_name } });
});

app.get('/api/users', async (req, res) => {
  const result = await pool.query(
    'SELECT username, display_name FROM users WHERE is_active = true ORDER BY display_name NULLS LAST, username'
  );
  res.json({ users: result.rows });
});

app.get('/api/me', async (req, res) => {
  const result = await pool.query(
    `SELECT u.username, u.display_name, o.organization_id, o.slug, o.name
     FROM users u
     LEFT JOIN organization_memberships m
       ON m.user_id = u.user_id
      AND m.left_at IS NULL
     LEFT JOIN organizations o
       ON o.organization_id = m.organization_id
     WHERE u.user_id = $1`,
    [req.user.user_id]
  );
  if (result.rowCount === 0) {
    return res.status(401).json({ error: 'INVALID_USER' });
  }
  const organizations = result.rows
    .filter((row) => row.organization_id)
    .map((row) => ({
      organization_id: row.organization_id,
      slug: row.slug,
      name: row.name,
    }));
  res.json({
    user: {
      username: result.rows[0].username,
      display_name: result.rows[0].display_name,
    },
    organizations,
    current_organization_id: req.user.organization_id || organizations[0]?.organization_id || null,
  });
});

app.get('/api/organizations', async (req, res) => {
  const result = await pool.query(
    `SELECT o.organization_id, o.slug, o.name
     FROM organizations o
     JOIN organization_memberships m
       ON m.organization_id = o.organization_id
      AND m.left_at IS NULL
     WHERE m.user_id = $1
     ORDER BY o.name`,
    [req.user.user_id]
  );
  res.json({ organizations: result.rows });
});

app.get('/api/projects', async (req, res) => {
  const requestedOrgId = req.query.orgId;
  let orgId = req.user.organization_id;
  if (requestedOrgId && !ALLOW_CROSS_ORG_QUERY) {
    return res.status(403).json({ error: 'CROSS_ORG_QUERY_DISABLED' });
  }
  if (requestedOrgId && ALLOW_CROSS_ORG_QUERY) {
    const hasOrgAccess = await ensureOrgAccessByUserId(requestedOrgId, req.user.user_id);
    if (!hasOrgAccess) {
      return res.status(403).json({ error: 'ORG_FORBIDDEN' });
    }
    orgId = requestedOrgId;
  }
  if (!orgId) {
    return res.status(400).json({ error: 'ORG_ID_REQUIRED' });
  }
  const result = await pool.query(
    `SELECT p.project_id, p.name, p.customer
     FROM projects p
     JOIN organization_memberships m
       ON m.organization_id = p.organization_id
      AND m.left_at IS NULL
     JOIN users u ON u.user_id = m.user_id
     WHERE p.organization_id = $1
       AND u.username = $2
     ORDER BY p.name`,
    [orgId, req.user.username]
  );
  res.json({ projects: result.rows });
});

app.get('/api/projects/:projectId/permissions', requireProjectAccess, async (req, res) => {
  const result = await pool.query(
    `SELECT permission_code
     FROM v_rbac_user_project_permissions
     WHERE project_id = $1 AND username = $2
     ORDER BY permission_code`,
    [req.params.projectId, req.user.username]
  );
  res.json({ permissions: result.rows.map((row) => row.permission_code) });
});

app.post('/api/session/switch-org', async (req, res) => {
  if (!requireBodyFields(['organizationId'], req, res)) {
    return;
  }
  const organizationId = req.body.organizationId;
  const hasOrgAccess = await ensureOrgAccessByUserId(organizationId, req.user.user_id);
  if (!hasOrgAccess) {
    return res.status(403).json({ error: 'ORG_FORBIDDEN' });
  }
  const token = jwt.sign(
    {
      username: req.user.username,
      user_id: req.user.user_id,
      organization_id: organizationId,
    },
    jwtSecret,
    { expiresIn: '12h' }
  );
  res.json({ token });
});
app.get('/api/projects/:projectId/litteras', requireProjectAccess, async (req, res) => {
  const result = await pool.query(
    `SELECT littera_id, code, title
     FROM litteras
     WHERE project_id = $1
     ORDER BY code`,
    [req.params.projectId]
  );
  res.json({ litteras: result.rows });
});

app.get('/api/projects/:projectId/target-batches', requireProjectAccess, async (req, res) => {
  const result = await pool.query(
    `SELECT import_batch_id, imported_at, notes
     FROM import_batches
     WHERE project_id = $1 AND source_system = 'TARGET_ESTIMATE'
     ORDER BY imported_at DESC`,
    [req.params.projectId]
  );
  res.json({ batches: result.rows });
});

app.get('/api/projects/:projectId/work-phases', requireProjectAccess, async (req, res) => {
  const result = await pool.query(
    `SELECT
      wp.work_phase_id,
      wp.name,
      wp.description,
      wp.status,
      summary.current_version_id,
      summary.latest_baseline_id,
      summary.bac_total,
      summary.percent_complete,
      report.ev_value,
      report.ac_total,
      report.ghost_open_total,
      report.ac_star_total,
      report.cpi
    FROM work_phases wp
    JOIN v_work_phase_summary_mvp summary
      ON summary.work_phase_id = wp.work_phase_id
    LEFT JOIN v_report_work_phase_current report
      ON report.work_phase_id = wp.work_phase_id
    WHERE wp.project_id = $1
    ORDER BY wp.created_at`,
    [req.params.projectId]
  );
  res.json({ workPhases: result.rows });
});

app.post('/api/projects/:projectId/work-phases', requireProjectAccess, async (req, res) => {
  if (!requireBodyFields(['name'], req, res)) {
    return;
  }
  const allowed = await requirePermission(
    req.params.projectId,
    req.user.username,
    'WORK_PHASE_CREATE',
    res
  );
  if (!allowed) {
    return;
  }
  const { name, description, owner, leadLitteraId } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const phaseResult = await client.query(
      `INSERT INTO work_phases (project_id, name, description, owner, lead_littera_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING work_phase_id`,
      [req.params.projectId, name, description || null, owner || null, leadLitteraId || null, req.user.username]
    );
    const workPhaseId = phaseResult.rows[0].work_phase_id;
    const versionResult = await client.query(
      `INSERT INTO work_phase_versions (project_id, work_phase_id, version_no, status, notes, created_by)
       VALUES ($1, $2, 1, 'ACTIVE', $3, $4)
       RETURNING work_phase_version_id`,
      [req.params.projectId, workPhaseId, 'Initial version', req.user.username]
    );
    await client.query('COMMIT');
    res.status(201).json({
      work_phase_id: workPhaseId,
      current_version_id: versionResult.rows[0].work_phase_version_id,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'CREATE_WORK_PHASE_FAILED', detail: error.message });
  } finally {
    client.release();
  }
});

app.get('/api/work-phases/:id', async (req, res) => {
  const summaryResult = await pool.query(
    `SELECT
      summary.project_id,
      summary.work_phase_id,
      summary.work_phase_name,
      summary.work_phase_status,
      summary.current_version_id,
      summary.latest_baseline_id,
      summary.bac_total,
      summary.percent_complete,
      report.ev_value,
      report.ac_total,
      report.ghost_open_total,
      report.ac_star_total,
      report.cpi
     FROM v_work_phase_summary_mvp summary
     LEFT JOIN v_report_work_phase_current report
       ON report.work_phase_id = summary.work_phase_id
     WHERE summary.work_phase_id = $1`,
    [req.params.id]
  );
  if (summaryResult.rowCount === 0) {
    return res.status(404).json({ error: 'WORK_PHASE_NOT_FOUND' });
  }
  const projectId = summaryResult.rows[0].project_id;
  const hasAccess = await ensureProjectAccessByUserId(projectId, req.user.user_id);
  if (!hasAccess) {
    return res.status(403).json({ error: 'PROJECT_FORBIDDEN' });
  }
  res.json({ workPhase: summaryResult.rows[0] });
});

app.post('/api/work-phases/:id/version', async (req, res) => {
  const context = await getWorkPhaseContext(req.params.id);
  if (!context) {
    return res.status(404).json({ error: 'WORK_PHASE_NOT_FOUND' });
  }
  const hasAccess = await ensureProjectAccessByUserId(context.project_id, req.user.user_id);
  if (!hasAccess) {
    return res.status(403).json({ error: 'PROJECT_FORBIDDEN' });
  }
  const allowed = await requirePermission(
    context.project_id,
    req.user.username,
    'WORK_PHASE_VERSION_CREATE',
    res
  );
  if (!allowed) {
    return;
  }
  if (!requireSetupState(context, res)) {
    return;
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const activeVersionResult = await client.query(
      'SELECT work_phase_version_id FROM work_phase_versions WHERE work_phase_id = $1 AND status = $2',
      [req.params.id, 'ACTIVE']
    );
    const activeVersionId = activeVersionResult.rows[0]?.work_phase_version_id || null;
    const versionNumberResult = await client.query(
      'SELECT COALESCE(MAX(version_no), 0) + 1 AS next_version FROM work_phase_versions WHERE work_phase_id = $1',
      [req.params.id]
    );
    const nextVersion = versionNumberResult.rows[0].next_version;
    await client.query(
      `UPDATE work_phase_versions
       SET status = 'RETIRED'
       WHERE work_phase_id = $1 AND status = 'ACTIVE'`,
      [req.params.id]
    );
    const versionResult = await client.query(
      `INSERT INTO work_phase_versions (project_id, work_phase_id, version_no, status, notes, created_by)
       VALUES ($1, $2, $3, 'ACTIVE', $4, $5)
       RETURNING work_phase_version_id`,
      [context.project_id, req.params.id, nextVersion, req.body.notes || null, req.user.username]
    );
    if (activeVersionId) {
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
        WHERE work_phase_version_id = $3`,
        [versionResult.rows[0].work_phase_version_id, req.user.username, activeVersionId]
      );
    }
    await client.query('COMMIT');
    res.status(201).json({ work_phase_version_id: versionResult.rows[0].work_phase_version_id });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'CREATE_VERSION_FAILED', detail: error.message });
  } finally {
    client.release();
  }
});

app.get('/api/work-phases/:id/members', async (req, res) => {
  const versionResult = await pool.query(
    `SELECT cv.work_phase_version_id, w.project_id
     FROM v_work_phase_current_version cv
     JOIN work_phases w ON w.work_phase_id = cv.work_phase_id
     WHERE cv.work_phase_id = $1`,
    [req.params.id]
  );
  if (versionResult.rowCount === 0) {
    return res.status(404).json({ error: 'WORK_PHASE_NOT_FOUND' });
  }
  const projectId = versionResult.rows[0].project_id;
  const hasAccess = await ensureProjectAccessByUserId(projectId, req.user.user_id);
  if (!hasAccess) {
    return res.status(403).json({ error: 'PROJECT_FORBIDDEN' });
  }
  const membersResult = await pool.query(
    `SELECT m.work_phase_member_id, m.member_type, m.littera_id, l.code AS littera_code,
            l.title AS littera_title, m.item_code, m.item_desc, m.note
     FROM work_phase_members m
     LEFT JOIN litteras l
       ON l.project_id = m.project_id
      AND l.littera_id = m.littera_id
     WHERE m.work_phase_version_id = $1
     ORDER BY m.created_at`,
    [versionResult.rows[0].work_phase_version_id]
  );
  res.json({ members: membersResult.rows });
});

app.post('/api/work-phases/:id/members', async (req, res) => {
  if (!requireBodyFields(['memberType'], req, res)) {
    return;
  }
  const phaseResult = await pool.query(
    `SELECT w.project_id, summary.latest_baseline_id, cv.work_phase_version_id
     FROM work_phases w
     JOIN v_work_phase_summary_mvp summary ON summary.work_phase_id = w.work_phase_id
     JOIN v_work_phase_current_version cv ON cv.work_phase_id = w.work_phase_id
     WHERE w.work_phase_id = $1`,
    [req.params.id]
  );
  if (phaseResult.rowCount === 0) {
    return res.status(404).json({ error: 'WORK_PHASE_NOT_FOUND' });
  }
  const phase = phaseResult.rows[0];
  const hasAccess = await ensureProjectAccessByUserId(phase.project_id, req.user.user_id);
  if (!hasAccess) {
    return res.status(403).json({ error: 'PROJECT_FORBIDDEN' });
  }
  const allowed = await requirePermission(
    phase.project_id,
    req.user.username,
    'WORK_PHASE_MEMBER_CREATE',
    res
  );
  if (!allowed) {
    return;
  }
  if (phase.latest_baseline_id) {
    return res.status(409).json({ error: 'BASELINE_ALREADY_LOCKED' });
  }
  const memberType = req.body.memberType;
  if (memberType === 'LITTERA' && !requireBodyFields(['litteraId'], req, res)) {
    return;
  }
  if (memberType === 'ITEM' && !requireBodyFields(['itemCode'], req, res)) {
    return;
  }
  const result = await pool.query(
    `INSERT INTO work_phase_members (
      project_id,
      work_phase_version_id,
      member_type,
      littera_id,
      item_code,
      item_desc,
      note,
      created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING work_phase_member_id`,
    [
      phase.project_id,
      phase.work_phase_version_id,
      memberType,
      req.body.litteraId || null,
      req.body.itemCode || null,
      req.body.itemDesc || null,
      req.body.note || null,
      req.user.username,
    ]
  );
  res.status(201).json({ work_phase_member_id: result.rows[0].work_phase_member_id });
});

app.post('/api/work-phases/:id/lock-baseline', async (req, res) => {
  if (!requireBodyFields(['targetImportBatchId'], req, res)) {
    return;
  }
  const context = await getWorkPhaseContext(req.params.id);
  if (!context) {
    return res.status(404).json({ error: 'WORK_PHASE_NOT_FOUND' });
  }
  const hasAccess = await ensureProjectAccessByUserId(context.project_id, req.user.user_id);
  if (!hasAccess) {
    return res.status(403).json({ error: 'PROJECT_FORBIDDEN' });
  }
  const allowed = await requirePermission(
    context.project_id,
    req.user.username,
    'BASELINE_LOCK',
    res
  );
  if (!allowed) {
    return;
  }
  if (!requireSetupState(context, res)) {
    return;
  }
  const versionResult = await pool.query(
    `SELECT work_phase_version_id
     FROM v_work_phase_current_version
     WHERE work_phase_id = $1`,
    [req.params.id]
  );
  if (versionResult.rowCount === 0) {
    return res.status(404).json({ error: 'WORK_PHASE_VERSION_NOT_FOUND' });
  }
  try {
    const result = await pool.query(
      'SELECT work_phase_lock_baseline_secure($1, $2, $3, $4, $5) AS baseline_id',
      [
        req.params.id,
        versionResult.rows[0].work_phase_version_id,
        req.body.targetImportBatchId,
        req.user.username,
        req.body.notes || null,
      ]
    );
    res.json({ baseline_id: result.rows[0].baseline_id });
  } catch (error) {
    res.status(400).json({ error: 'LOCK_BASELINE_FAILED', detail: error.message });
  }
});

app.post('/api/work-phases/:id/weekly-update', async (req, res) => {
  if (!requireBodyFields(['weekEnding', 'percentComplete'], req, res)) {
    return;
  }
  const context = await getWorkPhaseContext(req.params.id);
  if (!context) {
    return res.status(404).json({ error: 'WORK_PHASE_NOT_FOUND' });
  }
  const hasAccess = await ensureProjectAccessByUserId(context.project_id, req.user.user_id);
  if (!hasAccess) {
    return res.status(403).json({ error: 'PROJECT_FORBIDDEN' });
  }
  const allowed = await requirePermission(
    context.project_id,
    req.user.username,
    'WORK_PHASE_WEEKLY_UPDATE_CREATE',
    res
  );
  if (!allowed) {
    return;
  }
  if (!requireTrackState(context, res)) {
    return;
  }
  await pool.query(
    `INSERT INTO work_phase_weekly_updates (
      project_id, work_phase_id, week_ending, percent_complete, progress_notes, risks, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      context.project_id,
      req.params.id,
      req.body.weekEnding,
      req.body.percentComplete,
      req.body.progressNotes || null,
      req.body.risks || null,
      req.user.username,
    ]
  );
  res.status(201).json({ status: 'ok' });
});

app.post('/api/work-phases/:id/ghost', async (req, res) => {
  if (!requireBodyFields(['weekEnding', 'costType', 'amount'], req, res)) {
    return;
  }
  const context = await getWorkPhaseContext(req.params.id);
  if (!context) {
    return res.status(404).json({ error: 'WORK_PHASE_NOT_FOUND' });
  }
  const hasAccess = await ensureProjectAccessByUserId(context.project_id, req.user.user_id);
  if (!hasAccess) {
    return res.status(403).json({ error: 'PROJECT_FORBIDDEN' });
  }
  const allowed = await requirePermission(
    context.project_id,
    req.user.username,
    'GHOST_ENTRY_CREATE',
    res
  );
  if (!allowed) {
    return;
  }
  if (!requireTrackState(context, res)) {
    return;
  }
  await pool.query(
    `INSERT INTO ghost_cost_entries (
      project_id, work_phase_id, week_ending, cost_type, amount, description, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      context.project_id,
      req.params.id,
      req.body.weekEnding,
      req.body.costType,
      req.body.amount,
      req.body.description || null,
      req.user.username,
    ]
  );
  res.status(201).json({ status: 'ok' });
});

app.get('/api/projects/:projectId/reports/project-current', requireProjectAccess, async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM v_report_project_current WHERE project_id = $1',
    [req.params.projectId]
  );
  res.json({ report: result.rows[0] || null });
});

app.get('/api/projects/:projectId/reports/work-phase-current', requireProjectAccess, async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM v_report_work_phase_current WHERE project_id = $1 ORDER BY work_phase_name',
    [req.params.projectId]
  );
  res.json({ report: result.rows });
});

app.get('/api/projects/:projectId/reports/main-group-current', requireProjectAccess, async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM v_report_project_main_group_current WHERE project_id = $1 ORDER BY main_group_code',
    [req.params.projectId]
  );
  res.json({ rows: result.rows });
});

app.get('/api/projects/:projectId/reports/weekly-ev', requireProjectAccess, async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM v_report_project_weekly_ev WHERE project_id = $1 ORDER BY week_ending',
    [req.params.projectId]
  );
  res.json({ rows: result.rows });
});

app.get('/api/projects/:projectId/reports/monthly-target-raw', requireProjectAccess, async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM v_report_monthly_target_cost_raw WHERE project_id = $1 ORDER BY month_key',
    [req.params.projectId]
  );
  res.json({ rows: result.rows });
});

app.get('/api/projects/:projectId/reports/monthly-work-phase', requireProjectAccess, async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM v_report_monthly_work_phase WHERE project_id = $1 ORDER BY month_key, work_phase_name',
    [req.params.projectId]
  );
  res.json({ rows: result.rows });
});

app.get('/api/projects/:projectId/reports/top-overruns', requireProjectAccess, async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM v_report_top_overruns_work_phases WHERE project_id = $1',
    [req.params.projectId]
  );
  res.json({ rows: result.rows });
});

app.get('/api/projects/:projectId/reports/lowest-cpi', requireProjectAccess, async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM v_report_lowest_cpi_work_phases WHERE project_id = $1',
    [req.params.projectId]
  );
  res.json({ rows: result.rows });
});

app.get('/api/projects/:projectId/reports/top-selvitettavat', requireProjectAccess, async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM v_report_top_selvitettavat_littera WHERE project_id = $1',
    [req.params.projectId]
  );
  res.json({ rows: result.rows });
});

app.get('/api/projects/:projectId/reports/overlap', requireProjectAccess, async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM v_report_overlap_litteras WHERE project_id = $1',
    [req.params.projectId]
  );
  res.json({ rows: result.rows });
});

app.get('/api/projects/:projectId/selvitettavat', requireProjectAccess, async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM v_selvitettavat_actuals_by_littera WHERE project_id = $1 ORDER BY actual_total DESC',
    [req.params.projectId]
  );
  res.json({ selvitettavat: result.rows });
});

app.get('/api/projects/:projectId/corrections/queue', requireProjectAccess, async (req, res) => {
  const result = await pool.query(
    `SELECT * FROM v_work_phase_corrections_queue
     WHERE project_id = $1
     ORDER BY proposed_at DESC`,
    [req.params.projectId]
  );
  res.json({ corrections: result.rows });
});

app.post('/api/work-phases/:id/corrections/propose', async (req, res) => {
  if (!requireBodyFields(['itemCode'], req, res)) {
    return;
  }
  const context = await getWorkPhaseContext(req.params.id);
  if (!context) {
    return res.status(404).json({ error: 'WORK_PHASE_NOT_FOUND' });
  }
  const hasAccess = await ensureProjectAccessByUserId(context.project_id, req.user.user_id);
  if (!hasAccess) {
    return res.status(403).json({ error: 'PROJECT_FORBIDDEN' });
  }
  const allowed = await requirePermission(
    context.project_id,
    req.user.username,
    'CORRECTION_PROPOSE',
    res
  );
  if (!allowed) {
    return;
  }
  if (!requireTrackState(context, res)) {
    return;
  }
  try {
    const result = await pool.query(
      'SELECT work_phase_propose_add_littera_from_item_secure($1, $2, $3, $4) AS correction_id',
      [req.params.id, req.body.itemCode, req.user.username, req.body.notes || null]
    );
    res.status(201).json({ correction_id: result.rows[0].correction_id });
  } catch (error) {
    res.status(400).json({ error: 'CORRECTION_PROPOSE_FAILED', detail: error.message });
  }
});

app.post('/api/corrections/:id/approve-pm', async (req, res) => {
  const projectResult = await pool.query(
    'SELECT project_id FROM work_phase_corrections WHERE correction_id = $1',
    [req.params.id]
  );
  if (projectResult.rowCount === 0) {
    return res.status(404).json({ error: 'CORRECTION_NOT_FOUND' });
  }
  const projectId = projectResult.rows[0].project_id;
  const hasAccess = await ensureProjectAccessByUserId(projectId, req.user.user_id);
  if (!hasAccess) {
    return res.status(403).json({ error: 'PROJECT_FORBIDDEN' });
  }
  const allowed = await hasPermission(projectId, req.user.username, 'CORRECTION_APPROVE_PM');
  if (!allowed) {
    return res.status(403).json({ error: 'NO_PERMISSION', permission: 'CORRECTION_APPROVE_PM' });
  }
  try {
    await pool.query(
      'SELECT work_phase_approve_correction_pm_secure($1, $2, $3)',
      [req.params.id, req.user.username, req.body.comment || null]
    );
    res.json({ status: 'ok' });
  } catch (error) {
    res.status(400).json({ error: 'CORRECTION_APPROVE_PM_FAILED', detail: error.message });
  }
});

app.post('/api/corrections/:id/approve-final', async (req, res) => {
  const projectResult = await pool.query(
    'SELECT project_id FROM work_phase_corrections WHERE correction_id = $1',
    [req.params.id]
  );
  if (projectResult.rowCount === 0) {
    return res.status(404).json({ error: 'CORRECTION_NOT_FOUND' });
  }
  const projectId = projectResult.rows[0].project_id;
  const hasAccess = await ensureProjectAccessByUserId(projectId, req.user.user_id);
  if (!hasAccess) {
    return res.status(403).json({ error: 'PROJECT_FORBIDDEN' });
  }
  const allowed = await hasPermission(projectId, req.user.username, 'CORRECTION_APPROVE_FINAL');
  if (!allowed) {
    return res.status(403).json({ error: 'NO_PERMISSION', permission: 'CORRECTION_APPROVE_FINAL' });
  }
  try {
    const result = await pool.query(
      'SELECT work_phase_approve_correction_final_secure($1, $2, $3) AS new_version_id',
      [req.params.id, req.user.username, req.body.comment || null]
    );
    res.json({ status: 'ok', new_version_id: result.rows[0].new_version_id });
  } catch (error) {
    res.status(400).json({ error: 'CORRECTION_APPROVE_FINAL_FAILED', detail: error.message });
  }
});

app.post('/api/corrections/:id/reject', async (req, res) => {
  const projectResult = await pool.query(
    'SELECT project_id FROM work_phase_corrections WHERE correction_id = $1',
    [req.params.id]
  );
  if (projectResult.rowCount === 0) {
    return res.status(404).json({ error: 'CORRECTION_NOT_FOUND' });
  }
  const projectId = projectResult.rows[0].project_id;
  const hasAccess = await ensureProjectAccessByUserId(projectId, req.user.user_id);
  if (!hasAccess) {
    return res.status(403).json({ error: 'PROJECT_FORBIDDEN' });
  }
  const canReject = await hasPermission(projectId, req.user.username, 'CORRECTION_APPROVE_PM');
  const canRejectFinal = await hasPermission(projectId, req.user.username, 'CORRECTION_APPROVE_FINAL');
  if (!canReject && !canRejectFinal) {
    return res.status(403).json({ error: 'NO_PERMISSION', permission: 'CORRECTION_APPROVE_PM' });
  }
  try {
    await pool.query(
      'SELECT work_phase_reject_correction($1, $2, $3)',
      [req.params.id, req.user.username, req.body.comment || null]
    );
    res.json({ status: 'ok' });
  } catch (error) {
    res.status(400).json({ error: 'CORRECTION_REJECT_FAILED', detail: error.message });
  }
});

app.get('/api/terminology/dictionary', async (req, res) => {
  const { orgId, locale, fallback } = req.query;
  if (!locale) {
    return res.status(400).json({ error: 'LOCALE_REQUIRED' });
  }
  if (orgId && !req.user) {
    return res.status(401).json({ error: 'AUTH_REQUIRED' });
  }
  let resolvedOrgId = orgId || req.user?.organization_id || null;
  if (resolvedOrgId && req.user) {
    const hasOrgAccess = await ensureOrgAccessByUserId(resolvedOrgId, req.user.user_id);
    if (!hasOrgAccess) {
      return res.status(403).json({ error: 'ORG_FORBIDDEN' });
    }
  }
  const result = await pool.query(
    'SELECT * FROM terminology_get_dictionary($1, $2, $3)',
    [resolvedOrgId, locale, fallback || 'en']
  );
  res.json({ terms: result.rows });
});

app.use(express.static(path.join(__dirname, '..', 'ui')));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'UNEXPECTED_ERROR' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});
