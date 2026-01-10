import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://codex:codex@db:5432/codex';

const pool = new Pool({ connectionString: DATABASE_URL });

async function tableExists(name) {
  const result = await pool.query('SELECT to_regclass($1) AS name', [`public.${name}`]);
  return Boolean(result.rows[0]?.name);
}

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
    {
      username: 'myyja',
      display_name: 'Myyjä Demo',
      email: 'myyja@kide-asunnot.fi',
      pin: 'demo',
    },
    {
      username: 'antti.halla@kide-asunnot.fi',
      display_name: 'Antti Halla',
      email: 'antti.halla@kide-asunnot.fi',
      pin: 'antti123',
    },
    {
      username: 'mikko.lahti@kide-asunnot.fi',
      display_name: 'Mikko Lahti',
      email: 'mikko.lahti@kide-asunnot.fi',
      pin: 'mikko123',
    },
    {
      username: 'jari.koski@kide-asunnot.fi',
      display_name: 'Jari Koski',
      email: 'jari.koski@kide-asunnot.fi',
      pin: 'jari123',
    },
    {
      username: 'sami.ranta@kide-asunnot.fi',
      display_name: 'Sami Ranta',
      email: 'sami.ranta@kide-asunnot.fi',
      pin: 'sami123',
    },
    {
      username: 'timo.aaltonen@kide-asunnot.fi',
      display_name: 'Timo Aaltonen',
      email: 'timo.aaltonen@kide-asunnot.fi',
      pin: 'timo123',
    },
    {
      username: 'ville.niemi@kide-asunnot.fi',
      display_name: 'Ville Niemi',
      email: 'ville.niemi@kide-asunnot.fi',
      pin: 'ville123',
    },
    {
      username: 'laura.paakkonen@kide-asunnot.fi',
      display_name: 'Laura Paakkonen',
      email: 'laura.paakkonen@kide-asunnot.fi',
      pin: 'laura123',
    },
    {
      username: 'teemu.savola@kide-asunnot.fi',
      display_name: 'Teemu Savola',
      email: 'teemu.savola@kide-asunnot.fi',
      pin: 'teemu123',
    },
    {
      username: 'johanna.lehto@kide-asunnot.fi',
      display_name: 'Johanna Lehto',
      email: 'johanna.lehto@kide-asunnot.fi',
      pin: 'johanna123',
    },
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

async function ensureDemoProjects(orgId) {
  const demoProjects = [
    { code: '0001', name: 'Kide-Asunnot Demo' },
    { code: '0002', name: 'Kide rivitalo' },
    { code: '0003', name: 'Kide kerrostalo' },
    { code: '0004', name: 'Kide Toimitila' },
    { code: '0005', name: 'Kide Pientalo' },
    { code: '0006', name: 'Kide Halli' },
    { code: '0007', name: 'Kide Saneeraus' },
    { code: '0008', name: 'Kide Varasto' },
    { code: '0009', name: 'Kide Hotelli' },
    { code: '0010', name: 'Kide Koulu' },
    { code: '0011', name: 'Kide Paivakoti' },
    { code: '0012', name: 'Kide Liiketila' },
  ];

  const projectIds = {};
  for (const project of demoProjects) {
    const fullName = `${project.code} ${project.name}`;
    const existing = await pool.query('SELECT project_id FROM projects WHERE name = $1', [fullName]);
    if (existing.rowCount > 0) {
      projectIds[project.code] = existing.rows[0].project_id;
      continue;
    }
    const result = await pool.query(
      `INSERT INTO projects (organization_id, name, customer)
       VALUES ($1, $2, 'Kide')
       RETURNING project_id`,
      [orgId, fullName]
    );
    projectIds[project.code] = result.rows[0].project_id;
  }
  return projectIds;
}

async function ensureRoleAssignments(projectId, userIds, orgId) {
  await pool.query(
    `INSERT INTO roles (role_code, role_name_fi, description)
     VALUES ('SELLER', 'Myyjä', 'Luo asiakkuuksia ja onboarding-linkkejä')
     ON CONFLICT (role_code) DO NOTHING`
  );

  await pool.query(
    `INSERT INTO organization_role_assignments (organization_id, user_id, role_code, granted_by)
     SELECT $1, $2, 'ORG_ADMIN', 'seed'
     WHERE NOT EXISTS (
       SELECT 1 FROM organization_role_assignments
       WHERE organization_id = $1 AND user_id = $2 AND role_code = 'ORG_ADMIN' AND revoked_at IS NULL
     )`,
    [orgId, userIds.admin]
  );

  if (userIds.myyja) {
    await pool.query(
      `INSERT INTO organization_role_assignments (organization_id, user_id, role_code, granted_by)
       SELECT $1, $2, 'SELLER', 'seed'
       WHERE NOT EXISTS (
         SELECT 1 FROM organization_role_assignments
         WHERE organization_id = $1 AND user_id = $2 AND role_code = 'SELLER' AND revoked_at IS NULL
       )`,
      [orgId, userIds.myyja]
    );
  }

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

async function ensureDemoRoleAssignments(projectIds, userIds) {
  const foremen = [
    { username: 'antti.halla@kide-asunnot.fi', projects: ['0001', '0007'] },
    { username: 'mikko.lahti@kide-asunnot.fi', projects: ['0002', '0008'] },
    { username: 'jari.koski@kide-asunnot.fi', projects: ['0003', '0009'] },
    { username: 'sami.ranta@kide-asunnot.fi', projects: ['0004', '0010'] },
    { username: 'timo.aaltonen@kide-asunnot.fi', projects: ['0005', '0011'] },
    { username: 'ville.niemi@kide-asunnot.fi', projects: ['0006', '0012'] },
  ];

  const managers = [
    {
      username: 'laura.paakkonen@kide-asunnot.fi',
      projects: ['0001', '0002', '0003', '0007', '0008', '0009'],
    },
    {
      username: 'teemu.savola@kide-asunnot.fi',
      projects: ['0004', '0005', '0006', '0010', '0011', '0012'],
    },
  ];

  const production = {
    username: 'johanna.lehto@kide-asunnot.fi',
    projects: Object.keys(projectIds),
  };

  const assignments = [
    ...foremen.map((user) => ({ ...user, role: 'GENERAL_FOREMAN' })),
    ...managers.map((user) => ({ ...user, role: 'PROJECT_MANAGER' })),
    { ...production, role: 'PRODUCTION_MANAGER' },
  ];

  for (const assignment of assignments) {
    const userId = userIds[assignment.username];
    if (!userId) {
      continue;
    }
    for (const code of assignment.projects) {
      const projectId = projectIds[code];
      if (!projectId) {
        continue;
      }
      await pool.query(
        `INSERT INTO project_role_assignments (project_id, user_id, role_code, granted_by)
         SELECT $1, $2, $3, 'seed'
         WHERE NOT EXISTS (
           SELECT 1 FROM project_role_assignments
           WHERE project_id = $1 AND user_id = $2 AND role_code = $3 AND revoked_at IS NULL
         )`,
        [projectId, userId, assignment.role]
      );
    }
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
    { code: '0100', title: 'Perustukset', group_code: 0 },
    { code: '0310', title: 'ARK-suunnittelu', group_code: 0 },
    { code: '1100', title: 'Maanrakennus', group_code: 1 },
    { code: '1200', title: 'Perustukset', group_code: 1 },
    { code: '1300', title: 'Runkotyöt', group_code: 2 },
    { code: '1400', title: 'Sisävalmistus', group_code: 3 },
    { code: '2500', title: 'Valuosat', group_code: 2 },
    { code: '4101', title: 'Pystyelementit toimitus', group_code: 4 },
    { code: '4102', title: 'Pystyelementit asennus', group_code: 4 },
    { code: '4300', title: 'Sähkötyöt', group_code: 4 },
    { code: '6700', title: 'Valuosat (tavoitearvio)', group_code: 6 },
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

async function ensureImportBatch(projectId, kind, sourceSystem, fileName) {
  const fileHash = crypto
    .createHash('sha256')
    .update(`seed:${projectId}:${kind}:${sourceSystem}`)
    .digest('hex');
  const existing = await pool.query(
    'SELECT id FROM import_batches WHERE project_id = $1 AND kind = $2 AND file_hash = $3 ORDER BY created_at DESC LIMIT 1',
    [projectId, kind, fileHash]
  );
  if (existing.rowCount > 0) {
    return existing.rows[0].id;
  }
  const result = await pool.query(
    `INSERT INTO import_batches (project_id, kind, source_system, file_name, file_hash, created_by)
     VALUES ($1, $2, $3, $4, $5, 'seed')
     RETURNING id`,
    [projectId, kind, sourceSystem, fileName, fileHash]
  );
  return result.rows[0].id;
}

async function ensureBaselineWorkPackage(projectId, code, name) {
  const existing = await pool.query(
    'SELECT id FROM work_packages WHERE project_id = $1 AND code = $2',
    [projectId, code]
  );
  if (existing.rowCount > 0) {
    return existing.rows[0].id;
  }
  const result = await pool.query(
    `INSERT INTO work_packages (project_id, code, name, status, created_at)
     VALUES ($1, $2, $3, 'ACTIVE', now())
     RETURNING id`,
    [projectId, code, name]
  );
  return result.rows[0].id;
}

async function ensureBaselineProcPackage(projectId, code, name, defaultWorkPackageId) {
  const existing = await pool.query(
    'SELECT id FROM proc_packages WHERE project_id = $1 AND code = $2',
    [projectId, code]
  );
  if (existing.rowCount > 0) {
    return existing.rows[0].id;
  }
  const result = await pool.query(
    `INSERT INTO proc_packages (
      project_id, code, name, owner_type, vendor_name, contract_ref, default_work_package_id, status
    ) VALUES ($1, $2, $3, 'VENDOR', 'Seed-toimittaja', 'SEED-001', $4, 'ACTIVE')
    RETURNING id`,
    [projectId, code, name, defaultWorkPackageId]
  );
  return result.rows[0].id;
}

async function ensureTargetEstimateItems(projectId, importBatchId) {
  const items = [
    {
      item_code: '4101001',
      littera_code: '4101',
      description: 'Pystyelementit toimitus',
      qty: 10,
      unit: 'kpl',
      sum_eur: 120000,
      breakdown: { labor_eur: 0, material_eur: 0, subcontract_eur: 120000 }
    },
    {
      item_code: '4102003',
      littera_code: '4102',
      description: 'Pystyelementit asennus',
      qty: 5,
      unit: 'kpl',
      sum_eur: 80000,
      breakdown: { labor_eur: 80000 }
    },
    {
      item_code: '4300101',
      littera_code: '4300',
      description: 'Sähkötyöt',
      qty: 1,
      unit: 'era',
      sum_eur: 50000,
      breakdown: { subcontract_eur: 50000 }
    }
  ];

  for (const item of items) {
    await pool.query(
      `INSERT INTO target_estimate_items (
        import_batch_id,
        item_code,
        littera_code,
        description,
        qty,
        unit,
        sum_eur,
        cost_breakdown_json,
        row_type
      )
      SELECT $1, $2, $3, $4, $5, $6, $7, $8::jsonb, 'LEAF'
      WHERE NOT EXISTS (
        SELECT 1
        FROM target_estimate_items
        WHERE import_batch_id = $1
          AND item_code IS NOT DISTINCT FROM $2
          AND littera_code = $3
      )`,
      [
        importBatchId,
        item.item_code,
        item.littera_code,
        item.description,
        item.qty,
        item.unit,
        item.sum_eur,
        JSON.stringify(item.breakdown)
      ]
    );
  }

  const result = await pool.query(
    `SELECT id, item_code
     FROM target_estimate_items
     WHERE import_batch_id = $1`,
    [importBatchId]
  );
  return result.rows.reduce((acc, row) => {
    acc[row.item_code] = row.id;
    return acc;
  }, {});
}

async function ensureItemMappingVersion(projectId, importBatchId) {
  const existing = await pool.query(
    `SELECT id
     FROM item_mapping_versions
     WHERE project_id = $1 AND import_batch_id = $2 AND status = 'ACTIVE'
     ORDER BY created_at DESC
     LIMIT 1`,
    [projectId, importBatchId]
  );
  if (existing.rowCount > 0) {
    return existing.rows[0].id;
  }
  const result = await pool.query(
    `INSERT INTO item_mapping_versions (project_id, import_batch_id, status, created_by, activated_at)
     VALUES ($1, $2, 'ACTIVE', 'seed', now())
     RETURNING id`,
    [projectId, importBatchId]
  );
  return result.rows[0].id;
}

async function ensureItemRowMappings(mappingVersionId, targetEstimateItemId, workPackageId, procPackageId) {
  const candidates = [
    { workPackageId, procPackageId: null },
    { workPackageId, procPackageId }
  ];
  for (const candidate of candidates) {
    await pool.query(
      `INSERT INTO item_row_mappings (
        item_mapping_version_id,
        target_estimate_item_id,
        work_package_id,
        proc_package_id,
        created_by
      )
      SELECT $1, $2, $3, $4, 'seed'
      WHERE NOT EXISTS (
        SELECT 1
        FROM item_row_mappings
        WHERE item_mapping_version_id = $1
          AND target_estimate_item_id = $2
          AND work_package_id IS NOT DISTINCT FROM $3
          AND proc_package_id IS NOT DISTINCT FROM $4
          AND created_by = 'seed'
      )`,
      [mappingVersionId, targetEstimateItemId, candidate.workPackageId, candidate.procPackageId]
    );
  }
}

async function ensureTerminology() {
  const terms = [
    { key: 'ui.login.title', fi: 'Kirjautuminen', en: 'Login' },
    { key: 'ui.login.select_user', fi: 'Valitse käyttäjä', en: 'Select user' },
    { key: 'ui.login.pin', fi: 'PIN', en: 'PIN' },
    { key: 'ui.login.action', fi: 'Kirjaudu sisään', en: 'Sign in' },
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
    { key: 'ui.section.import_mappings', fi: 'Import-mappaukset', en: 'Import mappings' },
    { key: 'ui.section.import_mapping_budget', fi: 'Budjetin mappaus', en: 'Budget mapping' },
    { key: 'ui.section.import_mapping_jyda', fi: 'JYDA-mappaus', en: 'JYDA mapping' },
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
    { key: 'ui.field.files', fi: 'Tiedostot', en: 'Files' },
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
    { key: 'ui.action.load_mapping', fi: 'Hae mappaus', en: 'Load mapping' },
    { key: 'ui.action.save_mapping', fi: 'Tallenna mappaus', en: 'Save mapping' },
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
    { key: 'ui.status.empty', fi: 'Ei tuloksia', en: 'No results' },
    { key: 'ui.status.error', fi: 'Virhe', en: 'Error' },
    { key: 'ui.error.required', fi: 'Pakollinen', en: 'Required' },
    { key: 'ui.error.no_permission', fi: 'Ei oikeutta', en: 'No permission' },
    { key: 'ui.error.baseline_required', fi: 'Baseline lukittava ensin.', en: 'Baseline must be locked first.' },
    { key: 'ui.error.baseline_locked', fi: 'Baseline on jo lukittu.', en: 'Baseline is already locked.' },
    { key: 'ui.error.invalid_credentials', fi: 'Virheellinen tunnus tai PIN.', en: 'Invalid username or PIN.' },
    { key: 'ui.error.invalid_json', fi: 'Virhe: JSON ei ole kelvollinen.', en: 'Invalid JSON.' },
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
  const demoProjectIds = await ensureDemoProjects(orgId);
  await ensureExtraPermissions();
  await ensureRoleAssignments(projectId, userIds, orgId);
  await ensureDemoRoleAssignments(demoProjectIds, userIds);
  const targetBatchId = await ensureImportBatch(projectId, 'TARGET_ESTIMATE', 'SEED', 'seed-target-estimate.csv');
  await ensureImportBatch(projectId, 'ACTUALS', 'JYDA', 'seed-actuals.csv');

  const workPackageId = await ensureBaselineWorkPackage(projectId, '4100', 'Pystyelementit');
  const procPackageId = await ensureBaselineProcPackage(projectId, '4100', 'Pystyelementit-urakka', workPackageId);
  const itemIds = await ensureTargetEstimateItems(projectId, targetBatchId);
  const mappingVersionId = await ensureItemMappingVersion(projectId, targetBatchId);
  const primaryItemId = itemIds['4101001'] ?? Object.values(itemIds)[0];
  if (primaryItemId) {
    await ensureItemRowMappings(mappingVersionId, primaryItemId, workPackageId, procPackageId);
  }
  if (await tableExists('v_terminology_current')) {
    await ensureTerminology();
  }

  console.log('Seed completed');
}

run()
  .then(() => pool.end())
  .catch((error) => {
    console.error(error);
    pool.end();
    process.exit(1);
  });
