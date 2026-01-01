const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://codex:codex@db:5432/codex';

const pool = new Pool({ connectionString: DATABASE_URL });

async function ensureDefaultOrg() {
  const existing = await pool.query("SELECT organization_id FROM organizations WHERE slug = 'default'");
  if (existing.rowCount > 0) {
    return existing.rows[0].organization_id;
  }
  const result = await pool.query(
    "INSERT INTO organizations (slug, name, created_by) VALUES ('default', 'Default organization', 'seed') RETURNING organization_id"
  );
  return result.rows[0].organization_id;
}

async function ensureSecondaryOrg() {
  const existing = await pool.query("SELECT organization_id FROM organizations WHERE slug = 'secondary'");
  if (existing.rowCount > 0) {
    return existing.rows[0].organization_id;
  }
  const result = await pool.query(
    "INSERT INTO organizations (slug, name, created_by) VALUES ('secondary', 'Secondary organization', 'seed') RETURNING organization_id"
  );
  return result.rows[0].organization_id;
}

const crypto = require('crypto');
const PIN_SALT = process.env.PIN_SALT || 'dev-salt';

function hashPin(pin) {
  return crypto.createHash('sha256').update(`${pin}${PIN_SALT}`).digest('hex');
}

async function ensureUsers() {
  const users = [
    { username: 'anna', display_name: 'Anna Työnjohtaja', email: 'anna@example.com', pin: '1234' },
    { username: 'paavo', display_name: 'Paavo Työpäällikkö', email: 'paavo@example.com', pin: '1234' },
    { username: 'tuija', display_name: 'Tuija Tuotantojohtaja', email: 'tuija@example.com', pin: '1234' },
    { username: 'admin', display_name: 'Org Admin', email: 'admin@example.com', pin: '1234' },
  ];
  for (const user of users) {
    const pinHash = hashPin(user.pin);
    await pool.query(
      `INSERT INTO users (username, display_name, email, pin_hash, created_by)
       VALUES ($1, $2, $3, $4, 'seed')
       ON CONFLICT (username) DO UPDATE
         SET display_name = EXCLUDED.display_name,
             email = EXCLUDED.email,
             pin_hash = EXCLUDED.pin_hash`,
      [user.username, user.display_name, user.email, pinHash]
    );
  }
  const result = await pool.query('SELECT user_id, username FROM users WHERE username = ANY($1)', [
    users.map((user) => user.username),
  ]);
  return result.rows.reduce((acc, row) => {
    acc[row.username] = row.user_id;
    return acc;
  }, {});
}

async function ensureMemberships(orgId, userIds) {
  const usernames = Object.keys(userIds);
  for (const username of usernames) {
    await pool.query(
      `INSERT INTO organization_memberships (organization_id, user_id, joined_by)
       SELECT $1, $2, 'seed'
       WHERE NOT EXISTS (
         SELECT 1 FROM organization_memberships
         WHERE organization_id = $1 AND user_id = $2 AND left_at IS NULL
       )`,
      [orgId, userIds[username]]
    );
  }
}

async function ensureProject(orgId) {
  const existing = await pool.query("SELECT project_id FROM projects WHERE name = 'MVP-projekti'");
  if (existing.rowCount > 0) {
    return existing.rows[0].project_id;
  }
  const result = await pool.query(
    `INSERT INTO projects (organization_id, name, customer)
     VALUES ($1, 'MVP-projekti', 'Asiakas Oy')
     RETURNING project_id`,
    [orgId]
  );
  return result.rows[0].project_id;
}

async function ensureRoleAssignments(projectId, userIds, orgId) {
  await pool.query(
    `INSERT INTO organization_role_assignments (organization_id, user_id, role_code, granted_by)
     SELECT $1, $2, 'ORG_ADMIN', 'seed'
     WHERE NOT EXISTS (
       SELECT 1 FROM organization_role_assignments
       WHERE organization_id = $1 AND user_id = $2 AND role_code = 'ORG_ADMIN' AND revoked_at IS NULL
     )`,
    [orgId, userIds.admin]
  );

  const projectRoles = [
    { username: 'anna', role: 'SITE_FOREMAN' },
    { username: 'paavo', role: 'PROJECT_MANAGER' },
    { username: 'tuija', role: 'PRODUCTION_MANAGER' },
  ];

  for (const assignment of projectRoles) {
    await pool.query(
      `INSERT INTO project_role_assignments (project_id, user_id, role_code, granted_by)
       SELECT $1, $2, $3, 'seed'
       WHERE NOT EXISTS (
         SELECT 1 FROM project_role_assignments
         WHERE project_id = $1 AND user_id = $2 AND role_code = $3 AND revoked_at IS NULL
       )`,
      [projectId, userIds[assignment.username], assignment.role]
    );
  }
}

async function ensureExtraPermissions() {
  await pool.query(
    `INSERT INTO permissions (permission_code, description)
     VALUES
       ('WORK_PHASE_CREATE', 'Saa luoda työvaiheita'),
       ('WORK_PHASE_MEMBER_CREATE', 'Saa lisätä työvaiheen jäseniä'),
       ('WORK_PHASE_VERSION_CREATE', 'Saa luoda työvaiheversion')
     ON CONFLICT (permission_code) DO NOTHING`
  );

  await pool.query(
    `INSERT INTO role_permissions (role_code, permission_code)
     VALUES
       ('PROJECT_MANAGER', 'WORK_PHASE_CREATE'),
       ('PROJECT_MANAGER', 'WORK_PHASE_MEMBER_CREATE'),
       ('PROJECT_MANAGER', 'WORK_PHASE_VERSION_CREATE')
     ON CONFLICT DO NOTHING`
  );
}

async function ensureLitteras(projectId) {
  const litteraSeed = [
    { code: '1100', title: 'Maanrakennus', group_code: 1 },
    { code: '1200', title: 'Perustukset', group_code: 1 },
    { code: '1300', title: 'Runkotyöt', group_code: 2 },
    { code: '1400', title: 'Sisävalmistus', group_code: 3 },
  ];

  for (const littera of litteraSeed) {
    await pool.query(
      `INSERT INTO litteras (project_id, code, title, group_code)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (project_id, code) DO NOTHING`,
      [projectId, littera.code, littera.title, littera.group_code]
    );
  }

  const result = await pool.query(
    'SELECT littera_id, code FROM litteras WHERE project_id = $1',
    [projectId]
  );
  return result.rows.reduce((acc, row) => {
    acc[row.code] = row.littera_id;
    return acc;
  }, {});
}

async function ensureImportBatch(projectId, sourceSystem) {
  const existing = await pool.query(
    'SELECT import_batch_id FROM import_batches WHERE project_id = $1 AND source_system = $2 ORDER BY imported_at DESC LIMIT 1',
    [projectId, sourceSystem]
  );
  if (existing.rowCount > 0) {
    return existing.rows[0].import_batch_id;
  }
  const result = await pool.query(
    `INSERT INTO import_batches (project_id, source_system, imported_by, notes)
     VALUES ($1, $2, 'seed', 'Seed batch')
     RETURNING import_batch_id`,
    [projectId, sourceSystem]
  );
  return result.rows[0].import_batch_id;
}

async function ensureBudgetLines(projectId, batchId, litteraIds) {
  const budgetLines = [
    { code: '1100', cost_type: 'LABOR', amount: 120000 },
    { code: '1100', cost_type: 'MATERIAL', amount: 45000 },
    { code: '1200', cost_type: 'LABOR', amount: 90000 },
    { code: '1200', cost_type: 'SUBCONTRACT', amount: 30000 },
    { code: '1300', cost_type: 'LABOR', amount: 60000 },
    { code: '1400', cost_type: 'MATERIAL', amount: 50000 },
  ];

  for (const line of budgetLines) {
    await pool.query(
      `INSERT INTO budget_lines (project_id, target_littera_id, cost_type, amount, source, import_batch_id, created_by)
       SELECT $1, $2, $3, $4, 'IMPORT', $5, 'seed'
       WHERE NOT EXISTS (
         SELECT 1 FROM budget_lines
         WHERE project_id = $1 AND target_littera_id = $2 AND cost_type = $3 AND import_batch_id = $5
       )`,
      [projectId, litteraIds[line.code], line.cost_type, line.amount, batchId]
    );
  }
}

async function ensureBudgetItems(projectId, batchId, litteraIds) {
  const items = [
    {
      litteraCode: '1300',
      item_code: '56001013',
      item_desc: 'Lisätyö: teräspalkit',
      row_no: 10,
      total_eur: 15000,
    },
  ];

  for (const item of items) {
    await pool.query(
      `INSERT INTO budget_items (
        project_id, import_batch_id, littera_id, item_code, item_desc, row_no, total_eur, created_by
      )
      SELECT $1, $2, $3, $4, $5, $6, $7, 'seed'
      WHERE NOT EXISTS (
        SELECT 1 FROM budget_items WHERE project_id = $1 AND import_batch_id = $2 AND item_code = $4
      )`,
      [
        projectId,
        batchId,
        litteraIds[item.litteraCode],
        item.item_code,
        item.item_desc,
        item.row_no,
        item.total_eur,
      ]
    );
  }
}

async function ensureMapping(projectId, litteraIds) {
  const existing = await pool.query(
    `SELECT mapping_version_id FROM mapping_versions
     WHERE project_id = $1 AND status = 'ACTIVE'
     ORDER BY valid_from DESC LIMIT 1`,
    [projectId]
  );
  let mappingVersionId;
  if (existing.rowCount > 0) {
    mappingVersionId = existing.rows[0].mapping_version_id;
  } else {
    const result = await pool.query(
      `INSERT INTO mapping_versions (project_id, valid_from, status, reason, created_by)
       VALUES ($1, CURRENT_DATE, 'ACTIVE', 'Seed mapping', 'seed')
       RETURNING mapping_version_id`,
      [projectId]
    );
    mappingVersionId = result.rows[0].mapping_version_id;
  }

  const mappingLines = ['1100', '1200'];
  for (const code of mappingLines) {
    await pool.query(
      `INSERT INTO mapping_lines (
        project_id,
        mapping_version_id,
        work_littera_id,
        target_littera_id,
        allocation_rule,
        allocation_value,
        created_by
      )
      SELECT $1, $2, $3, $3, 'FULL', 1.0, 'seed'
      WHERE NOT EXISTS (
        SELECT 1 FROM mapping_lines
        WHERE mapping_version_id = $2 AND work_littera_id = $3 AND cost_type IS NULL
      )`,
      [projectId, mappingVersionId, litteraIds[code]]
    );
  }
}

async function ensureWorkPhases(projectId, litteraIds, targetBatchId) {
  const phases = [
    { name: 'Maanrakennus', memberCodes: ['1100', '1200'], lockBaseline: true },
    { name: 'Sisävalmistus', memberCodes: ['1400'], lockBaseline: false },
  ];

  for (const phase of phases) {
    const existing = await pool.query(
      'SELECT work_phase_id FROM work_phases WHERE project_id = $1 AND name = $2',
      [projectId, phase.name]
    );
    let workPhaseId;
    if (existing.rowCount > 0) {
      workPhaseId = existing.rows[0].work_phase_id;
    } else {
      const result = await pool.query(
        `INSERT INTO work_phases (project_id, name, description, created_by)
         VALUES ($1, $2, $3, 'seed')
         RETURNING work_phase_id`,
        [projectId, phase.name, `${phase.name} - seed`]
      );
      workPhaseId = result.rows[0].work_phase_id;
    }

    const versionResult = await pool.query(
      "SELECT work_phase_version_id FROM work_phase_versions WHERE work_phase_id = $1 AND status = 'ACTIVE'",
      [workPhaseId]
    );
    let versionId;
    if (versionResult.rowCount > 0) {
      versionId = versionResult.rows[0].work_phase_version_id;
    } else {
      const createdVersion = await pool.query(
        `INSERT INTO work_phase_versions (project_id, work_phase_id, version_no, status, notes, created_by)
         VALUES ($1, $2, 1, 'ACTIVE', 'Seed version', 'seed')
         RETURNING work_phase_version_id`,
        [projectId, workPhaseId]
      );
      versionId = createdVersion.rows[0].work_phase_version_id;
    }

    for (const code of phase.memberCodes) {
      await pool.query(
        `INSERT INTO work_phase_members (project_id, work_phase_version_id, member_type, littera_id, created_by)
         SELECT $1, $2, 'LITTERA', $3, 'seed'
         WHERE NOT EXISTS (
           SELECT 1 FROM work_phase_members
           WHERE work_phase_version_id = $2 AND littera_id = $3 AND member_type = 'LITTERA'
         )`,
        [projectId, versionId, litteraIds[code]]
      );
    }

    if (phase.lockBaseline) {
      const baselineResult = await pool.query(
        'SELECT work_phase_baseline_id FROM work_phase_baselines WHERE work_phase_id = $1',
        [workPhaseId]
      );
      if (baselineResult.rowCount === 0) {
        await pool.query(
          'SELECT work_phase_lock_baseline_secure($1, $2, $3, $4, $5)',
          [workPhaseId, versionId, targetBatchId, 'paavo', 'Seed baseline']
        );
      }
    }
  }
}

async function ensureActuals(projectId, jydaBatchId, litteraIds) {
  const actuals = [
    { code: '1100', cost_type: 'LABOR', amount: 15000, external_ref: 'JYDA.ACTUAL_COST' },
    { code: '1400', cost_type: 'MATERIAL', amount: 5000, external_ref: 'JYDA.ACTUAL_COST' },
  ];
  for (const line of actuals) {
    await pool.query(
      `INSERT INTO actual_cost_lines (
        project_id, work_littera_id, cost_type, amount, occurred_on, source, import_batch_id, external_ref
      )
      SELECT $1, $2, $3, $4, CURRENT_DATE, 'JYDA', $5, $6
      WHERE NOT EXISTS (
        SELECT 1 FROM actual_cost_lines
        WHERE project_id = $1 AND work_littera_id = $2 AND cost_type = $3 AND amount = $4 AND external_ref = $6
      )`,
      [projectId, litteraIds[line.code], line.cost_type, line.amount, jydaBatchId, line.external_ref]
    );
  }
}

async function ensureWeeklyUpdate(projectId) {
  const phaseResult = await pool.query(
    "SELECT work_phase_id FROM work_phases WHERE project_id = $1 AND name = 'Maanrakennus'",
    [projectId]
  );
  if (phaseResult.rowCount === 0) {
    return;
  }
  const phaseId = phaseResult.rows[0].work_phase_id;
  await pool.query(
    `INSERT INTO work_phase_weekly_updates (
      project_id, work_phase_id, week_ending, percent_complete, progress_notes, risks, created_by
    )
    SELECT $1, $2, CURRENT_DATE, 35, 'Perustusmuotit valmiit', 'Sään vaikutus', 'anna'
    WHERE NOT EXISTS (
      SELECT 1 FROM work_phase_weekly_updates
      WHERE work_phase_id = $2 AND week_ending = CURRENT_DATE
    )`,
    [projectId, phaseId]
  );
}

async function ensureTerminology() {
  const terms = [
    { key: 'ui.login.title', fi: 'Kirjautuminen', en: 'Login' },
    { key: 'ui.login.select_user', fi: 'Valitse käyttäjä', en: 'Select user' },
    { key: 'ui.login.pin', fi: 'PIN', en: 'PIN' },
    { key: 'ui.login.action', fi: 'Kirjaudu', en: 'Sign in' },
    { key: 'ui.org.select', fi: 'Valitse organisaatio', en: 'Select organization' },
    { key: 'ui.project.select', fi: 'Valitse projekti', en: 'Select project' },
    { key: 'ui.action.refresh', fi: 'Päivitä', en: 'Refresh' },
    { key: 'ui.action.logout', fi: 'Kirjaudu ulos', en: 'Log out' },
    { key: 'ui.section.work_phases', fi: 'Työvaiheet', en: 'Work phases' },
    { key: 'ui.section.project_summary', fi: 'Projektikoonti', en: 'Project summary' },
    { key: 'ui.section.project_reports', fi: 'Projektiraportit', en: 'Project reports' },
    { key: 'ui.section.main_groups', fi: 'Pääryhmät', en: 'Main groups' },
    { key: 'ui.section.weekly_ev', fi: 'Viikkotrendi (EV)', en: 'Weekly trend (EV)' },
    { key: 'ui.section.monthly_work_phase', fi: 'Kuukausiraportti', en: 'Monthly report' },
    { key: 'ui.section.report_packages', fi: 'Raporttipaketit', en: 'Report packages' },
    { key: 'ui.section.top_overruns', fi: 'Top-poikkeamat', en: 'Top overruns' },
    { key: 'ui.section.lowest_cpi', fi: 'Heikoimmat CPI:t', en: 'Lowest CPI' },
    { key: 'ui.section.top_selvitettavat', fi: 'Selvitettävät (top)', en: 'Unmapped actuals (top)' },
    { key: 'ui.section.overlap', fi: 'Overlap-varoitukset', en: 'Overlap warnings' },
    { key: 'ui.section.create_work_phase', fi: 'Luo työvaihe', en: 'Create work phase' },
    { key: 'ui.section.kpi', fi: 'KPI', en: 'KPI' },
    { key: 'ui.section.members', fi: 'Jäsenlitterat', en: 'Members' },
    { key: 'ui.section.members_add', fi: 'Lisää jäsen', en: 'Add member' },
    { key: 'ui.section.lock_baseline', fi: 'Lukitse baseline', en: 'Lock baseline' },
    { key: 'ui.section.weekly_update', fi: 'Viikkopäivitys', en: 'Weekly update' },
    { key: 'ui.section.ghost', fi: 'Ghost-kulut', en: 'Ghost costs' },
    { key: 'ui.section.corrections', fi: 'Korjausehdotus', en: 'Correction proposal' },
    { key: 'ui.section.corrections_queue', fi: 'Korjausjono', en: 'Corrections queue' },
    { key: 'ui.section.version', fi: 'Versio', en: 'Version' },
    { key: 'metric.bac', fi: 'BAC', en: 'BAC' },
    { key: 'metric.ev', fi: 'EV', en: 'EV' },
    { key: 'metric.ac', fi: 'AC', en: 'AC' },
    { key: 'metric.ghost_open', fi: 'Ghost (open)', en: 'Ghost (open)' },
    { key: 'metric.ac_star', fi: 'AC*', en: 'AC*' },
    { key: 'metric.cpi', fi: 'CPI', en: 'CPI' },
    { key: 'metric.percent_complete', fi: 'Valmiusaste %', en: 'Percent complete' },
    { key: 'term.selvitettavat', fi: 'Selvitettävät', en: 'Unmapped actuals' },
    { key: 'ui.field.name', fi: 'Nimi', en: 'Name' },
    { key: 'ui.field.description', fi: 'Kuvaus', en: 'Description' },
    { key: 'ui.field.member_type', fi: 'Tyyppi', en: 'Type' },
    { key: 'ui.field.littera', fi: 'Littera', en: 'Littera' },
    { key: 'ui.field.item_code', fi: 'Nimike / koodi', en: 'Item code' },
    { key: 'ui.field.item_desc', fi: 'Selite', en: 'Description' },
    { key: 'ui.field.note', fi: 'Muistiinpano', en: 'Note' },
    { key: 'ui.field.week_ending', fi: 'Viikko päättyy', en: 'Week ending' },
    { key: 'ui.field.progress_notes', fi: 'Edistyminen', en: 'Progress notes' },
    { key: 'ui.field.risks', fi: 'Riskit', en: 'Risks' },
    { key: 'ui.field.cost_type', fi: 'Kustannuslaji', en: 'Cost type' },
    { key: 'ui.field.amount', fi: 'Summa', en: 'Amount' },
    { key: 'ui.field.target_batch', fi: 'Tavoitearvio-erä', en: 'Target estimate batch' },
    { key: 'ui.field.status', fi: 'Tila', en: 'Status' },
    { key: 'ui.field.actions', fi: 'Toiminnot', en: 'Actions' },
    { key: 'ui.field.sent_at', fi: 'Lähetetty', en: 'Sent at' },
    { key: 'ui.field.artifact_type', fi: 'Tyyppi', en: 'Type' },
    { key: 'ui.field.checksum', fi: 'Checksum', en: 'Checksum' },
    { key: 'ui.field.work_phase', fi: 'Työvaihe', en: 'Work phase' },
    { key: 'ui.field.main_group', fi: 'Pääryhmä', en: 'Main group' },
    { key: 'ui.field.budget_total', fi: 'Budjetti €', en: 'Budget €' },
    { key: 'ui.field.actual_total', fi: 'Toteuma €', en: 'Actual €' },
    { key: 'ui.field.variance_eur', fi: 'Poikkeama €', en: 'Variance €' },
    { key: 'ui.field.work_phases_updated', fi: 'Päivittyneet työvaiheet', en: 'Updated work phases' },
    { key: 'ui.field.month_key', fi: 'Kuukausi', en: 'Month' },
    { key: 'ui.field.search', fi: 'Haku', en: 'Search' },
    { key: 'ui.field.target_total', fi: 'Tavoite €', en: 'Target €' },
    { key: 'ui.field.forecast_total', fi: 'Ennuste €', en: 'Forecast €' },
    { key: 'ui.field.overrun_eur', fi: 'Ylitys €', en: 'Overrun €' },
    { key: 'ui.field.work_phase_count', fi: 'Työvaiheita', en: 'Work phases' },
    { key: 'ui.field.work_phase_ids', fi: 'Työvaihe ID:t', en: 'Work phase IDs' },
    { key: 'ui.action.create', fi: 'Luo', en: 'Create' },
    { key: 'ui.action.add_member', fi: 'Lisää jäsen', en: 'Add member' },
    { key: 'ui.action.lock_baseline', fi: 'Lukitse baseline', en: 'Lock baseline' },
    { key: 'ui.action.load_report_packages', fi: 'Hae raporttipaketit', en: 'Load report packages' },
    { key: 'ui.action.open_report_metadata', fi: 'Avaa metadata', en: 'Open metadata' },
    { key: 'ui.action.weekly_update', fi: 'Tallenna viikkopäivitys', en: 'Save weekly update' },
    { key: 'ui.action.add_ghost', fi: 'Lisää ghost', en: 'Add ghost' },
    { key: 'ui.action.propose_correction', fi: 'Ehdota korjausta', en: 'Propose correction' },
    { key: 'ui.action.approve_pm', fi: 'Hyväksy (PM)', en: 'Approve (PM)' },
    { key: 'ui.action.approve_final', fi: 'Hyväksy (final)', en: 'Approve (final)' },
    { key: 'ui.action.reject', fi: 'Hylkää', en: 'Reject' },
    { key: 'ui.action.create_version', fi: 'Luo uusi versio', en: 'Create new version' },
    { key: 'ui.action.filter', fi: 'Suodata', en: 'Filter' },
    { key: 'ui.filter.all', fi: 'Kaikki', en: 'All' },
    { key: 'ui.filter.setup', fi: 'SETUP', en: 'SETUP' },
    { key: 'ui.filter.track', fi: 'TRACK', en: 'TRACK' },
    { key: 'ui.tab.work_phase', fi: 'Työvaihe', en: 'Work phase' },
    { key: 'ui.tab.project', fi: 'Projekti', en: 'Project' },
    { key: 'ui.loading', fi: 'Ladataan...', en: 'Loading...' },
    { key: 'ui.status.loading', fi: 'Ladataan...', en: 'Loading...' },
    { key: 'ui.status.saving', fi: 'Tallennetaan...', en: 'Saving...' },
    { key: 'ui.status.saved', fi: 'Tallennettu', en: 'Saved' },
    { key: 'ui.status.loaded', fi: 'Ladattu', en: 'Loaded' },
    { key: 'ui.status.error', fi: 'Virhe', en: 'Error' },
    { key: 'ui.error.required', fi: 'Pakollinen', en: 'Required' },
    { key: 'ui.error.no_permission', fi: 'Ei oikeutta', en: 'No permission' },
    { key: 'ui.error.baseline_required', fi: 'Baseline lukittava ensin.', en: 'Baseline must be locked first.' },
    { key: 'ui.error.baseline_locked', fi: 'Baseline on jo lukittu.', en: 'Baseline is already locked.' },
    { key: 'ui.error.invalid_credentials', fi: 'Virheellinen tunnus tai PIN.', en: 'Invalid username or PIN.' },
    { key: 'ui.error.rate_limited', fi: 'Liian monta yritystä, yritä hetken päästä uudelleen.', en: 'Too many attempts, try again later.' },
    { key: 'ui.permission.denied', fi: 'Ei oikeutta', en: 'No permission' },
    { key: 'ui.work_phase.state.setup', fi: 'SETUP', en: 'SETUP' },
    { key: 'ui.work_phase.state.track', fi: 'TRACK', en: 'TRACK' },
    { key: 'ui.kpi.lock_baseline_first', fi: 'Lukitse baseline nähdäksesi KPI:t.', en: 'Lock baseline to view KPIs.' },
    { key: 'ui.empty.work_phases', fi: 'Ei työvaiheita.', en: 'No work phases.' },
    { key: 'ui.empty.select_work_phase', fi: 'Valitse työvaihe vasemmalta.', en: 'Select a work phase.' },
    { key: 'ui.empty.members', fi: 'Ei jäseniä.', en: 'No members.' },
    { key: 'ui.empty.corrections', fi: 'Ei korjauksia.', en: 'No corrections.' },
    { key: 'ui.empty.selvitettavat', fi: 'Ei selvitettäviä.', en: 'No unmapped actuals.' },
    { key: 'ui.empty.project_reports', fi: 'Valitse projekti nähdäksesi raportit.', en: 'Select a project to view reports.' },
    { key: 'ui.empty.main_groups', fi: 'Ei pääryhmätietoa.', en: 'No main group data.' },
    { key: 'ui.empty.weekly_ev', fi: 'Ei viikkotrendiä.', en: 'No weekly trend.' },
    { key: 'ui.empty.monthly_work_phase', fi: 'Ei kuukausiraporttia.', en: 'No monthly report.' },
    { key: 'ui.empty.report_packages', fi: 'Ei raporttipaketteja.', en: 'No report packages.' },
    { key: 'ui.empty.top_overruns', fi: 'Ei poikkeamia.', en: 'No overruns.' },
    { key: 'ui.empty.lowest_cpi', fi: 'Ei CPI-listaa.', en: 'No CPI list.' },
    { key: 'ui.empty.overlap', fi: 'Ei overlap-varoituksia.', en: 'No overlap warnings.' },
    { key: 'ui.member.littera', fi: 'Littera', en: 'Littera' },
    { key: 'ui.member.item', fi: 'Nimike', en: 'Item' },
    { key: 'ui.warning.overlap', fi: 'Tuplalaskenta-riski: littera kuuluu useaan baselinen lukittuun työvaiheeseen.', en: 'Double counting risk: littera belongs to multiple baseline-locked work phases.' },
    { key: 'ui.note.selvitettavat_detail', fi: 'Katso työvaihekohtaiset selvitettävät työvaihenäkymästä.', en: 'See work phase details for full unmapped list.' },
  ];

  for (const term of terms) {
    const existsFi = await pool.query(
      `SELECT 1 FROM v_terminology_current WHERE organization_id IS NULL AND locale = 'fi' AND term_key = $1`,
      [term.key]
    );
    if (existsFi.rowCount === 0) {
      await pool.query(
        'SELECT terminology_set_term(NULL, $1, $2, $3, NULL, $4, $5)',
        ['fi', term.key, term.fi, 'seed', 'seed']
      );
    }
    const existsEn = await pool.query(
      `SELECT 1 FROM v_terminology_current WHERE organization_id IS NULL AND locale = 'en' AND term_key = $1`,
      [term.key]
    );
    if (existsEn.rowCount === 0) {
      await pool.query(
        'SELECT terminology_set_term(NULL, $1, $2, $3, NULL, $4, $5)',
        ['en', term.key, term.en, 'seed', 'seed']
      );
    }
  }
}

async function run() {
  const orgId = await ensureDefaultOrg();
  const secondaryOrgId = await ensureSecondaryOrg();
  const userIds = await ensureUsers();
  await ensureMemberships(orgId, userIds);
  await ensureMemberships(secondaryOrgId, userIds);
  const projectId = await ensureProject(orgId);
  await ensureExtraPermissions();
  await ensureRoleAssignments(projectId, userIds, orgId);
  const litteraIds = await ensureLitteras(projectId);
  const targetBatchId = await ensureImportBatch(projectId, 'TARGET_ESTIMATE');
  const jydaBatchId = await ensureImportBatch(projectId, 'JYDA');
  await ensureBudgetLines(projectId, targetBatchId, litteraIds);
  await ensureBudgetItems(projectId, targetBatchId, litteraIds);
  await ensureMapping(projectId, litteraIds);
  await ensureWorkPhases(projectId, litteraIds, targetBatchId);
  await ensureActuals(projectId, jydaBatchId, litteraIds);
  await ensureWeeklyUpdate(projectId);
  await ensureTerminology();

  console.log('Seed completed');
}

run()
  .then(() => pool.end())
  .catch((error) => {
    console.error(error);
    pool.end();
    process.exit(1);
  });
