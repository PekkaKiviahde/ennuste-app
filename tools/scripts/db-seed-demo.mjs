import { Client } from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL puuttuu");
  process.exit(1);
}

const baseDemoUsers = [
  { username: "site.foreman", display: "Tyonjohtaja", projectRoles: ["SITE_FOREMAN"] },
  { username: "general.foreman", display: "Vastaava mestari", projectRoles: ["GENERAL_FOREMAN"] },
  { username: "project.manager", display: "Tyopaallikko", projectRoles: ["PROJECT_MANAGER"] },
  { username: "production.manager", display: "Tuotantojohtaja", projectRoles: ["PRODUCTION_MANAGER"] },
  { username: "procurement", display: "Hankinta", projectRoles: ["PROCUREMENT"] },
  { username: "exec.readonly", display: "Johto (luku)", projectRoles: ["EXEC_READONLY"] },
  { username: "org.admin", display: "Organisaatio-admin", orgRoles: ["ORG_ADMIN"] },
  { username: "seller", display: "Myyja", orgRoles: ["SELLER"] }
];

const buildUsersWithSuffix = (users, suffix) =>
  users.map((user) => ({
    ...user,
    username: `${user.username}.${suffix}`,
    display: `${user.display} (${suffix.toUpperCase()})`,
    email: `${user.username}.${suffix}@demo.local`,
    projects: ["*"]
  }));

const costTypes = ["LABOR", "MATERIAL", "SUBCONTRACT", "RENTAL", "OTHER"];

const kideProjects = [
  {
    name: "Kide Kaarna",
    customer: "Kide-Asunnot Ot",
    projectState: "P0_PROJECT_DRAFT",
    details: {
      phase: "Suunnittelu",
      address: "Kaarenkuja 1, Oulu",
      startDate: "2026-01-15",
      endDate: "2026-12-15",
      managerName: "Petri Paallikko",
      managerEmail: "petri.paallikko@kide.local",
      targetEstimateFile: "excel/testdata_generated_kaarna/seed_control.csv"
    }
  },
  {
    name: "Kide Puro",
    customer: "Kide-Asunnot Ot",
    projectState: "P1_PROJECT_ACTIVE",
    details: {
      phase: "Maanrakennus",
      address: "Puronkuja 4, Oulu",
      startDate: "2026-02-01",
      endDate: "2026-12-20",
      managerName: "Petri Paallikko",
      managerEmail: "petri.paallikko@kide.local",
      targetEstimateFile: "excel/testdata_generated_kaarna/numbers_formats.csv"
    }
  },
  {
    name: "Kide Kivi",
    customer: "Kide-Asunnot Ot",
    projectState: "P1_PROJECT_ACTIVE",
    details: {
      phase: "Perustukset",
      address: "Kivikatu 9, Oulu",
      startDate: "2026-02-10",
      endDate: "2027-01-15",
      managerName: "Petri Paallikko",
      managerEmail: "petri.paallikko@kide.local",
      targetEstimateFile: "excel/testdata_generated_kaarna/broken_totals.csv"
    }
  },
  {
    name: "Kide Sointu",
    customer: "Kide-Asunnot Ot",
    projectState: "P1_PROJECT_ACTIVE",
    details: {
      phase: "Runko",
      address: "Soinnintie 6, Oulu",
      startDate: "2026-03-01",
      endDate: "2027-02-28",
      managerName: "Sari Paallikko",
      managerEmail: "sari.paallikko@kide.local",
      targetEstimateFile: "excel/testdata_generated_kaarna/bad_codes.csv"
    }
  },
  {
    name: "Kide Kajo",
    customer: "Kide-Asunnot Ot",
    projectState: "P1_PROJECT_ACTIVE",
    details: {
      phase: "Julkisivu",
      address: "Kajokuja 3, Oulu",
      startDate: "2026-03-20",
      endDate: "2027-03-15",
      managerName: "Sari Paallikko",
      managerEmail: "sari.paallikko@kide.local",
      targetEstimateFile: "excel/testdata_generated_kaarna/duplicates_conflicts.csv"
    }
  },
  {
    name: "Kide Utu",
    customer: "Kide-Asunnot Ot",
    projectState: "P2_PROJECT_ARCHIVED",
    details: {
      phase: "Sisavalmius",
      address: "Utukuja 2, Oulu",
      startDate: "2025-04-10",
      endDate: "2025-12-01",
      managerName: "Sari Paallikko",
      managerEmail: "sari.paallikko@kide.local",
      targetEstimateFile: "excel/testdata_generated_kaarna/text_encoding.csv"
    }
  }
];

const kideUsers = [
  {
    username: "kide.pm1",
    display: "Petri Paallikko",
    email: "petri.paallikko@kide.local",
    projectRoles: ["PROJECT_MANAGER"],
    projects: ["Kide Kaarna", "Kide Puro", "Kide Kivi"]
  },
  {
    username: "kide.pm2",
    display: "Sari Paallikko",
    email: "sari.paallikko@kide.local",
    projectRoles: ["PROJECT_MANAGER"],
    projects: ["Kide Sointu", "Kide Kajo", "Kide Utu"]
  },
  {
    username: "kide.gf1",
    display: "Vastaava Mestari 1",
    email: "gf1@kide.local",
    projectRoles: ["GENERAL_FOREMAN"],
    projects: ["Kide Kaarna"]
  },
  {
    username: "kide.gf2",
    display: "Vastaava Mestari 2",
    email: "gf2@kide.local",
    projectRoles: ["GENERAL_FOREMAN"],
    projects: ["Kide Puro"]
  },
  {
    username: "kide.gf3",
    display: "Vastaava Mestari 3",
    email: "gf3@kide.local",
    projectRoles: ["GENERAL_FOREMAN"],
    projects: ["Kide Kivi"]
  },
  {
    username: "kide.gf4",
    display: "Vastaava Mestari 4",
    email: "gf4@kide.local",
    projectRoles: ["GENERAL_FOREMAN"],
    projects: ["Kide Sointu"]
  },
  {
    username: "kide.gf5",
    display: "Vastaava Mestari 5",
    email: "gf5@kide.local",
    projectRoles: ["GENERAL_FOREMAN"],
    projects: ["Kide Kajo"]
  },
  {
    username: "kide.gf6",
    display: "Vastaava Mestari 6",
    email: "gf6@kide.local",
    projectRoles: ["GENERAL_FOREMAN"],
    projects: ["Kide Utu"]
  },
  {
    username: "kide.sf1",
    display: "Tyonjohtaja 1",
    email: "sf1@kide.local",
    projectRoles: ["SITE_FOREMAN"],
    projects: ["Kide Kaarna"]
  },
  {
    username: "kide.sf2",
    display: "Tyonjohtaja 2",
    email: "sf2@kide.local",
    projectRoles: ["SITE_FOREMAN"],
    projects: ["Kide Puro"]
  },
  {
    username: "kide.sf3",
    display: "Tyonjohtaja 3",
    email: "sf3@kide.local",
    projectRoles: ["SITE_FOREMAN"],
    projects: ["Kide Kivi"]
  },
  {
    username: "kide.sf4",
    display: "Tyonjohtaja 4",
    email: "sf4@kide.local",
    projectRoles: ["SITE_FOREMAN"],
    projects: ["Kide Sointu"]
  },
  {
    username: "kide.sf5",
    display: "Tyonjohtaja 5",
    email: "sf5@kide.local",
    projectRoles: ["SITE_FOREMAN"],
    projects: ["Kide Kajo"]
  },
  {
    username: "kide.sf6",
    display: "Tyonjohtaja 6",
    email: "sf6@kide.local",
    projectRoles: ["SITE_FOREMAN"],
    projects: ["Kide Utu"]
  },
  {
    username: "kide.prod",
    display: "Tuotantojohtaja",
    email: "tuotanto@kide.local",
    projectRoles: ["PRODUCTION_MANAGER"],
    projects: ["*"]
  },
  {
    username: "kide.proc",
    display: "Hankinta",
    email: "hankinta@kide.local",
    projectRoles: ["PROCUREMENT"],
    projects: ["*"]
  },
  {
    username: "kide.exec",
    display: "Johto Luku",
    email: "johto@kide.local",
    projectRoles: ["EXEC_READONLY"],
    projects: ["*"]
  },
  {
    username: "kide.orgadmin",
    display: "Organisaatio-admin",
    email: "admin@kide.local",
    orgRoles: ["ORG_ADMIN"]
  }
];

const tenantConfigs = [
  {
    suffix: "a",
    orgSlug: "demo-a",
    orgName: "Demo organisaatio A",
    tenantName: "Demo tenant A",
    users: buildUsersWithSuffix(baseDemoUsers, "a"),
    projects: [
      {
        name: "Demo projekti A",
        customer: "Demo asiakas A",
        projectState: "P1_PROJECT_ACTIVE",
        seedDemoData: true,
        seedLabel: "A"
      }
    ]
  },
  {
    suffix: "b",
    orgSlug: "demo-b",
    orgName: "Demo organisaatio B",
    tenantName: "Demo tenant B",
    users: buildUsersWithSuffix(baseDemoUsers, "b"),
    projects: [
      {
        name: "Demo projekti B",
        customer: "Demo asiakas B",
        projectState: "P1_PROJECT_ACTIVE",
        seedDemoData: true,
        seedLabel: "B"
      }
    ]
  },
  {
    suffix: "kide",
    orgSlug: "kide-asunnot-ot",
    orgName: "Kide-Asunnot Ot",
    tenantName: "Kide-Asunnot Ot",
    users: kideUsers,
    projects: kideProjects
  }
];

const ensureTenant = async (client, tenantName) => {
  const tenantResult = await client.query(
    "INSERT INTO tenants (name, created_by) VALUES ($1, 'seed') ON CONFLICT DO NOTHING RETURNING tenant_id",
    [tenantName]
  );
  let tenantId = tenantResult.rows[0]?.tenant_id;
  if (!tenantId) {
    const fallback = await client.query(
      "SELECT tenant_id FROM tenants WHERE name = $1 ORDER BY created_at DESC LIMIT 1",
      [tenantName]
    );
    tenantId = fallback.rows[0]?.tenant_id;
  }
  return tenantId;
};

const seedTenant = async (client, config) => {
  const orgResult = await client.query(
    "INSERT INTO organizations (slug, name, created_by) VALUES ($1, $2, 'seed') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING organization_id",
    [config.orgSlug, config.orgName]
  );
  const organizationId = orgResult.rows[0].organization_id;

  const tenantId = await ensureTenant(client, config.tenantName);

  const projectIdsByName = new Map();
  for (const project of config.projects) {
    const existingProject = await client.query(
      "SELECT project_id FROM projects WHERE name = $1 AND organization_id = $2::uuid",
      [project.name, organizationId]
    );
    let projectId = existingProject.rows[0]?.project_id;
    if (!projectId) {
      const projectResult = await client.query(
        "INSERT INTO projects (name, customer, organization_id, tenant_id, project_state, project_details, created_at) VALUES ($1, $2, $3::uuid, $4::uuid, $5::project_state, $6::jsonb, now()) RETURNING project_id",
        [
          project.name,
          project.customer || null,
          organizationId,
          tenantId,
          project.projectState || "P1_PROJECT_ACTIVE",
          JSON.stringify(project.details || {})
        ]
      );
      projectId = projectResult.rows[0].project_id;
    }
    projectIdsByName.set(project.name, projectId);
  }

  const userIdsByUsername = new Map();
  for (const user of config.users) {
    const userResult = await client.query(
      "INSERT INTO users (username, display_name, email, created_by, pin_hash) VALUES ($1, $2, $3, 'seed', crypt('1234', gen_salt('bf'))) ON CONFLICT (username) DO UPDATE SET display_name = EXCLUDED.display_name, pin_hash = EXCLUDED.pin_hash RETURNING user_id",
      [user.username, user.display, user.email || `${user.username}@demo.local`]
    );
    const userId = userResult.rows[0].user_id;
    userIdsByUsername.set(user.username, userId);

    const membershipExists = await client.query(
      "SELECT 1 FROM organization_memberships WHERE organization_id = $1::uuid AND user_id = $2::uuid AND left_at IS NULL",
      [organizationId, userId]
    );
    if (membershipExists.rowCount === 0) {
      await client.query(
        "INSERT INTO organization_memberships (organization_id, user_id, joined_by) VALUES ($1::uuid, $2::uuid, 'seed')",
        [organizationId, userId]
      );
    }

    for (const orgRole of user.orgRoles || []) {
      const orgRoleExists = await client.query(
        "SELECT 1 FROM organization_role_assignments WHERE organization_id = $1::uuid AND user_id = $2::uuid AND role_code = $3 AND revoked_at IS NULL",
        [organizationId, userId, orgRole]
      );
      if (orgRoleExists.rowCount === 0) {
        await client.query(
          "INSERT INTO organization_role_assignments (organization_id, user_id, role_code, granted_by) VALUES ($1::uuid, $2::uuid, $3, 'seed')",
          [organizationId, userId, orgRole]
        );
      }
    }
  }

  const allProjectNames = [...projectIdsByName.keys()];
  for (const user of config.users) {
    const projectRoles = user.projectRoles || [];
    if (projectRoles.length === 0) {
      continue;
    }
    const targetProjects =
      user.projects && user.projects.includes("*")
        ? allProjectNames
        : user.projects && user.projects.length > 0
          ? user.projects
          : allProjectNames;
    const userId = userIdsByUsername.get(user.username);
    if (!userId) {
      continue;
    }
    for (const projectName of targetProjects) {
      const projectId = projectIdsByName.get(projectName);
      if (!projectId) {
        continue;
      }
      for (const roleCode of projectRoles) {
        const projectRoleExists = await client.query(
          "SELECT 1 FROM project_role_assignments WHERE project_id = $1::uuid AND user_id = $2::uuid AND role_code = $3 AND revoked_at IS NULL",
          [projectId, userId, roleCode]
        );
        if (projectRoleExists.rowCount === 0) {
          await client.query(
            "INSERT INTO project_role_assignments (project_id, user_id, role_code, granted_by) VALUES ($1::uuid, $2::uuid, $3, 'seed')",
            [projectId, userId, roleCode]
          );
        }
      }
    }
  }

  for (const project of config.projects) {
    if (project.seedDemoData) {
      const projectId = projectIdsByName.get(project.name);
      if (projectId) {
        await seedDemoProjectData(client, projectId, project.seedLabel || config.suffix);
      }
    }
  }
};

const seedDemoProjectData = async (client, projectId, label) => {
  const litteraCodes = [
    { code: "1100", title: "Runko", group: 1 },
    { code: "1110", title: "Runko - valu", group: 1 },
    { code: "1120", title: "Runko - raudoitus", group: 1 },
    { code: "1130", title: "Runko - muotti", group: 1 },
    { code: "2100", title: "Julkisivu", group: 2 }
  ];

  for (const lit of litteraCodes) {
    await client.query(
      "INSERT INTO litteras (project_id, code, title, group_code) VALUES ($1::uuid, $2, $3, $4) ON CONFLICT (project_id, code) DO NOTHING",
      [projectId, lit.code, lit.title, lit.group]
    );
  }

  const litteraRows = await client.query(
    "SELECT littera_id, code FROM litteras WHERE project_id = $1::uuid",
    [projectId]
  );
  const litteraByCode = Object.fromEntries(litteraRows.rows.map((row) => [row.code, row.littera_id]));

  const targetBatchExisting = await client.query(
    "SELECT import_batch_id FROM import_batches WHERE project_id = $1::uuid AND source_system = 'TARGET_ESTIMATE' ORDER BY imported_at DESC LIMIT 1",
    [projectId]
  );
  let targetBatchId = targetBatchExisting.rows[0]?.import_batch_id;
  if (!targetBatchId) {
    const targetBatchResult = await client.query(
      "INSERT INTO import_batches (project_id, source_system, imported_by, notes) VALUES ($1::uuid, 'TARGET_ESTIMATE', 'seed', 'demo target estimate') RETURNING import_batch_id",
      [projectId]
    );
    targetBatchId = targetBatchResult.rows[0].import_batch_id;
  }

  for (const costType of costTypes) {
    const exists = await client.query(
      "SELECT 1 FROM budget_lines WHERE project_id = $1::uuid AND target_littera_id = $2::uuid AND cost_type = $3::cost_type AND import_batch_id = $4::uuid",
      [projectId, litteraByCode["1100"], costType, targetBatchId]
    );
    if (exists.rowCount === 0) {
      await client.query(
        "INSERT INTO budget_lines (project_id, target_littera_id, cost_type, amount, import_batch_id, created_by) VALUES ($1::uuid, $2::uuid, $3::cost_type, $4, $5::uuid, 'seed')",
        [projectId, litteraByCode["1100"], costType, 10000, targetBatchId]
      );
    }
  }

  const budgetItemExists = await client.query(
    "SELECT 1 FROM budget_items WHERE project_id = $1::uuid AND item_code = '56001013'",
    [projectId]
  );
  if (budgetItemExists.rowCount === 0) {
    await client.query(
      "INSERT INTO budget_items (project_id, import_batch_id, littera_id, item_code, item_desc, row_no, total_eur, created_by) VALUES ($1::uuid, $2::uuid, $3::uuid, '56001013', 'Runko item', 1, 12000, 'seed')",
      [projectId, targetBatchId, litteraByCode["1100"]]
    );
  }

  const mappingExisting = await client.query(
    "SELECT mapping_version_id, status FROM mapping_versions WHERE project_id = $1::uuid AND reason = 'demo mapping' ORDER BY created_at DESC LIMIT 1",
    [projectId]
  );
  let mappingVersionId = mappingExisting.rows[0]?.mapping_version_id;
  const mappingStatus = mappingExisting.rows[0]?.status;

  const workCodes = ["1110", "1120", "1130"];
  const insertMappingLines = async (versionId) => {
    for (const code of workCodes) {
      const exists = await client.query(
        "SELECT 1 FROM mapping_lines WHERE mapping_version_id = $1::uuid AND work_littera_id = $2::uuid",
        [versionId, litteraByCode[code]]
      );
      if (exists.rowCount === 0) {
        await client.query(
          "INSERT INTO mapping_lines (project_id, mapping_version_id, work_littera_id, target_littera_id, allocation_rule, allocation_value, created_by) VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, 'FULL', 1.0, 'seed')",
          [projectId, versionId, litteraByCode[code], litteraByCode["1100"]]
        );
      }
    }
  };

  if (!mappingVersionId) {
    const mappingVersionResult = await client.query(
      "INSERT INTO mapping_versions (project_id, valid_from, status, reason, created_by) VALUES ($1::uuid, current_date, 'DRAFT', 'demo mapping', 'seed') RETURNING mapping_version_id",
      [projectId]
    );
    mappingVersionId = mappingVersionResult.rows[0].mapping_version_id;
    await insertMappingLines(mappingVersionId);
    await client.query(
      "UPDATE mapping_versions SET status = 'ACTIVE', approved_by = 'seed', approved_at = now() WHERE mapping_version_id = $1::uuid",
      [mappingVersionId]
    );
  } else if (mappingStatus === "DRAFT") {
    await insertMappingLines(mappingVersionId);
    await client.query(
      "UPDATE mapping_versions SET status = 'ACTIVE', approved_by = 'seed', approved_at = now() WHERE mapping_version_id = $1::uuid",
      [mappingVersionId]
    );
  } else {
    const missing = [];
    for (const code of workCodes) {
      const exists = await client.query(
        "SELECT 1 FROM mapping_lines WHERE mapping_version_id = $1::uuid AND work_littera_id = $2::uuid",
        [mappingVersionId, litteraByCode[code]]
      );
      if (exists.rowCount === 0) {
        missing.push(code);
      }
    }

    if (missing.length > 0) {
      const mappingVersionResult = await client.query(
        "INSERT INTO mapping_versions (project_id, valid_from, status, reason, created_by) VALUES ($1::uuid, current_date, 'DRAFT', 'demo mapping', 'seed') RETURNING mapping_version_id",
        [projectId]
      );
      const newVersionId = mappingVersionResult.rows[0].mapping_version_id;
      await insertMappingLines(newVersionId);
      await client.query(
        "UPDATE mapping_versions SET status = 'RETIRED' WHERE mapping_version_id = $1::uuid",
        [mappingVersionId]
      );
      await client.query(
        "UPDATE mapping_versions SET status = 'ACTIVE', approved_by = 'seed', approved_at = now() WHERE mapping_version_id = $1::uuid",
        [newVersionId]
      );
      mappingVersionId = newVersionId;
    }
  }

  const jydaBatchExisting = await client.query(
    "SELECT import_batch_id FROM import_batches WHERE project_id = $1::uuid AND source_system = 'JYDA' ORDER BY imported_at DESC LIMIT 1",
    [projectId]
  );
  let jydaBatchId = jydaBatchExisting.rows[0]?.import_batch_id;
  if (!jydaBatchId) {
    const jydaBatchResult = await client.query(
      "INSERT INTO import_batches (project_id, source_system, imported_by, notes) VALUES ($1::uuid, 'JYDA', 'seed', 'demo actuals') RETURNING import_batch_id",
      [projectId]
    );
    jydaBatchId = jydaBatchResult.rows[0].import_batch_id;
  }

  const actualExists = await client.query(
    "SELECT 1 FROM actual_cost_lines WHERE project_id = $1::uuid AND work_littera_id = $2::uuid AND external_ref = 'JYDA.ACTUAL_COST'",
    [projectId, litteraByCode["1110"]]
  );
  if (actualExists.rowCount === 0) {
    await client.query(
      "INSERT INTO actual_cost_lines (project_id, work_littera_id, cost_type, amount, occurred_on, source, import_batch_id, external_ref) VALUES ($1::uuid, $2::uuid, 'LABOR', 2500, current_date, 'JYDA', $3::uuid, 'JYDA.ACTUAL_COST')",
      [projectId, litteraByCode["1110"], jydaBatchId]
    );
  }

  const planningExists = await client.query(
    "SELECT 1 FROM planning_events WHERE project_id = $1::uuid AND target_littera_id = $2::uuid",
    [projectId, litteraByCode["1100"]]
  );
  if (planningExists.rowCount === 0) {
    await client.query(
      "INSERT INTO planning_events (project_id, target_littera_id, status, summary, created_by) VALUES ($1::uuid, $2::uuid, 'READY_FOR_FORECAST', 'Demo suunnitelma', 'seed')",
      [projectId, litteraByCode["1100"]]
    );
  }

  const forecastExists = await client.query(
    "SELECT 1 FROM forecast_events WHERE project_id = $1::uuid AND target_littera_id = $2::uuid",
    [projectId, litteraByCode["1100"]]
  );
  if (forecastExists.rowCount === 0) {
    const forecastEventResult = await client.query(
      "INSERT INTO forecast_events (project_id, target_littera_id, mapping_version_id, source, comment, created_by) VALUES ($1::uuid, $2::uuid, $3::uuid, 'UI', 'Demo ennuste', 'seed') RETURNING forecast_event_id",
      [projectId, litteraByCode["1100"], mappingVersionId]
    );
    const forecastEventId = forecastEventResult.rows[0].forecast_event_id;

    for (const costType of costTypes) {
      await client.query(
        "INSERT INTO forecast_event_lines (forecast_event_id, cost_type, forecast_value, memo_general) VALUES ($1::uuid, $2::cost_type, $3, 'Demo memo')",
        [forecastEventId, costType, 9000]
      );
    }
  }

  const workPhaseExisting = await client.query(
    "SELECT work_phase_id FROM work_phases WHERE project_id = $1::uuid AND name = $2",
    [projectId, `Runko ${label.toUpperCase()}`]
  );
  let workPhaseId = workPhaseExisting.rows[0]?.work_phase_id;
  if (!workPhaseId) {
    const workPhaseResult = await client.query(
      "INSERT INTO work_phases (project_id, name, description, owner, lead_littera_id, status, created_by) VALUES ($1::uuid, $2, $3, 'seed', $4::uuid, 'ACTIVE', 'seed') RETURNING work_phase_id",
      [projectId, `Runko ${label.toUpperCase()}`, "Runko tyovaihe", litteraByCode["1100"]]
    );
    workPhaseId = workPhaseResult.rows[0].work_phase_id;
  }

  const versionExisting = await client.query(
    "SELECT work_phase_version_id FROM work_phase_versions WHERE work_phase_id = $1::uuid AND version_no = 1",
    [workPhaseId]
  );
  let workPhaseVersionId = versionExisting.rows[0]?.work_phase_version_id;
  if (!workPhaseVersionId) {
    const workPhaseVersionResult = await client.query(
      "INSERT INTO work_phase_versions (project_id, work_phase_id, version_no, status, notes, created_by) VALUES ($1::uuid, $2::uuid, 1, 'ACTIVE', 'demo', 'seed') RETURNING work_phase_version_id",
      [projectId, workPhaseId]
    );
    workPhaseVersionId = workPhaseVersionResult.rows[0].work_phase_version_id;
  }

  const memberExists = await client.query(
    "SELECT 1 FROM work_phase_members WHERE work_phase_version_id = $1::uuid AND littera_id = $2::uuid",
    [workPhaseVersionId, litteraByCode["1100"]]
  );
  if (memberExists.rowCount === 0) {
    await client.query(
      "INSERT INTO work_phase_members (project_id, work_phase_version_id, member_type, littera_id, note, created_by) VALUES ($1::uuid, $2::uuid, 'LITTERA', $3::uuid, 'demo', 'seed')",
      [projectId, workPhaseVersionId, litteraByCode["1100"]]
    );
  }

  const baselineExists = await client.query(
    "SELECT 1 FROM work_phase_baselines WHERE work_phase_id = $1::uuid AND target_import_batch_id = $2::uuid",
    [workPhaseId, targetBatchId]
  );
  if (baselineExists.rowCount === 0) {
    await client.query(
      "SELECT work_phase_lock_baseline($1::uuid, $2::uuid, $3::uuid, 'seed', 'demo baseline')",
      [workPhaseId, workPhaseVersionId, targetBatchId]
    );
  }

  const weeklyExists = await client.query(
    "SELECT 1 FROM work_phase_weekly_updates WHERE work_phase_id = $1::uuid",
    [workPhaseId]
  );
  if (weeklyExists.rowCount === 0) {
    await client.query(
      "INSERT INTO work_phase_weekly_updates (project_id, work_phase_id, week_ending, percent_complete, progress_notes, created_by) VALUES ($1::uuid, $2::uuid, current_date, 25, 'demo update', 'seed')",
      [projectId, workPhaseId]
    );
  }

  const ghostExists = await client.query(
    "SELECT 1 FROM ghost_cost_entries WHERE work_phase_id = $1::uuid",
    [workPhaseId]
  );
  if (ghostExists.rowCount === 0) {
    await client.query(
      "INSERT INTO ghost_cost_entries (project_id, work_phase_id, week_ending, cost_type, amount, description, created_by) VALUES ($1::uuid, $2::uuid, current_date, 'LABOR', 300, 'demo ghost', 'seed')",
      [projectId, workPhaseId]
    );
  }
};

const run = async () => {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  for (const config of tenantConfigs) {
    await seedTenant(client, config);
  }

  console.log("Demo seed valmis");
  await client.end();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
