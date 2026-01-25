import { Client } from "pg";
import crypto from "crypto";

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

const ensureDemoFlag = async (client, projectId) => {
  await client.query(
    "UPDATE projects SET is_demo = true, project_details = COALESCE(project_details, '{}'::jsonb) || '{\"demo\": true}'::jsonb WHERE project_id = $1::uuid",
    [projectId]
  );
};

const ensureBaselineImportBatch = async (client, projectId, kind, sourceSystem, fileName) => {
  const fileHash = crypto
    .createHash("sha256")
    .update(`seed:${projectId}:${kind}:${sourceSystem}`)
    .digest("hex");
  const existing = await client.query(
    "SELECT id FROM import_batches WHERE project_id = $1::uuid AND kind = $2 AND file_hash = $3 ORDER BY created_at DESC LIMIT 1",
    [projectId, kind, fileHash]
  );
  if (existing.rowCount > 0) {
    return existing.rows[0].id;
  }
  const result = await client.query(
    "INSERT INTO import_batches (project_id, kind, source_system, file_name, file_hash, created_by) VALUES ($1::uuid, $2, $3, $4, $5, 'seed') RETURNING id",
    [projectId, kind, sourceSystem, fileName, fileHash]
  );
  return result.rows[0].id;
};

const ensureBaselineWorkPackage = async (client, projectId, code, name) => {
  const existing = await client.query(
    "SELECT id FROM work_packages WHERE project_id = $1::uuid AND code = $2",
    [projectId, code]
  );
  if (existing.rowCount > 0) {
    return existing.rows[0].id;
  }
  const result = await client.query(
    "INSERT INTO work_packages (project_id, code, name, status, created_at) VALUES ($1::uuid, $2, $3, 'ACTIVE', now()) RETURNING id",
    [projectId, code, name]
  );
  return result.rows[0].id;
};

const ensureBaselineProcPackage = async (client, projectId, code, name, defaultWorkPackageId) => {
  const existing = await client.query(
    "SELECT id FROM proc_packages WHERE project_id = $1::uuid AND code = $2",
    [projectId, code]
  );
  if (existing.rowCount > 0) {
    return existing.rows[0].id;
  }
  const result = await client.query(
    `INSERT INTO proc_packages (
      project_id, code, name, owner_type, vendor_name, contract_ref, default_work_package_id, status
    ) VALUES ($1::uuid, $2, $3, 'VENDOR', 'Seed-toimittaja', 'SEED-001', $4::uuid, 'ACTIVE')
    RETURNING id`,
    [projectId, code, name, defaultWorkPackageId]
  );
  return result.rows[0].id;
};

const ensureBaselineTargetEstimateItems = async (client, importBatchId) => {
  const items = [
    {
      item_code: "4101001",
      littera_code: "4101",
      description: "Pystyelementit toimitus",
      qty: 10,
      unit: "kpl",
      sum_eur: 120000,
      breakdown: { labor_eur: 0, material_eur: 0, subcontract_eur: 120000 }
    },
    {
      item_code: "4102003",
      littera_code: "4102",
      description: "Pystyelementit asennus",
      qty: 5,
      unit: "kpl",
      sum_eur: 80000,
      breakdown: { labor_eur: 80000 }
    }
  ];

  for (const item of items) {
    await client.query(
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
      SELECT $1::uuid, $2, $3, $4, $5, $6, $7, $8::jsonb, 'LEAF'
      WHERE NOT EXISTS (
        SELECT 1
        FROM target_estimate_items
        WHERE import_batch_id = $1::uuid
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

  const result = await client.query(
    "SELECT id, item_code FROM target_estimate_items WHERE import_batch_id = $1::uuid",
    [importBatchId]
  );
  return Object.fromEntries(result.rows.map((row) => [row.item_code, row.id]));
};

const ensureBaselineItemMappingVersion = async (client, projectId, importBatchId) => {
  const existing = await client.query(
    "SELECT id FROM item_mapping_versions WHERE project_id = $1::uuid AND import_batch_id = $2::uuid AND status = 'ACTIVE' ORDER BY created_at DESC LIMIT 1",
    [projectId, importBatchId]
  );
  if (existing.rowCount > 0) {
    return existing.rows[0].id;
  }
  const result = await client.query(
    "INSERT INTO item_mapping_versions (project_id, import_batch_id, status, created_by, activated_at) VALUES ($1::uuid, $2::uuid, 'ACTIVE', 'seed', now()) RETURNING id",
    [projectId, importBatchId]
  );
  return result.rows[0].id;
};

const ensureBaselineItemRowMappings = async (client, mappingVersionId, targetEstimateItemId, workPackageId, procPackageId) => {
  const candidates = [
    { workPackageId, procPackageId: null },
    { workPackageId, procPackageId }
  ];
  for (const candidate of candidates) {
    await client.query(
      `INSERT INTO item_row_mappings (
        item_mapping_version_id,
        target_estimate_item_id,
        work_package_id,
        proc_package_id,
        created_by
      )
      SELECT $1::uuid, $2::uuid, $3::uuid, $4::uuid, 'seed'
      WHERE NOT EXISTS (
        SELECT 1
        FROM item_row_mappings
        WHERE item_mapping_version_id = $1::uuid
          AND target_estimate_item_id = $2::uuid
          AND work_package_id IS NOT DISTINCT FROM $3::uuid
          AND proc_package_id IS NOT DISTINCT FROM $4::uuid
          AND created_by = 'seed'
      )`,
      [mappingVersionId, targetEstimateItemId, candidate.workPackageId, candidate.procPackageId]
    );
  }
};

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
    const isDemoProject = project.seedDemoData === true || project.seedDemoData === "true";
    const projectDetails = {
      ...(project.details || {}),
      ...(isDemoProject ? { demo: true } : {})
    };
    const existingProject = await client.query(
      "SELECT project_id FROM projects WHERE name = $1 AND organization_id = $2::uuid ORDER BY created_at DESC LIMIT 1",
      [project.name, organizationId]
    );
    let projectId = existingProject.rows[0]?.project_id;
    if (!projectId) {
      const projectResult = await client.query(
        "INSERT INTO projects (name, customer, organization_id, tenant_id, project_state, is_demo, project_details, created_at) VALUES ($1, $2, $3::uuid, $4::uuid, $5::project_state, $6, $7::jsonb, now()) RETURNING project_id",
        [
          project.name,
          project.customer || null,
          organizationId,
          tenantId,
          project.projectState || "P1_PROJECT_ACTIVE",
          isDemoProject,
          JSON.stringify(projectDetails)
        ]
      );
      projectId = projectResult.rows[0].project_id;
    }
    if (isDemoProject && projectId) {
      await ensureDemoFlag(client, projectId);
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
  const targetBatchId = await ensureBaselineImportBatch(
    client,
    projectId,
    "TARGET_ESTIMATE",
    "SEED",
    `demo-target-estimate-${label}.csv`
  );
  await ensureBaselineImportBatch(client, projectId, "ACTUALS", "JYDA", `demo-actuals-${label}.csv`);

  const workPackageId = await ensureBaselineWorkPackage(client, projectId, "4100", `Runko ${label.toUpperCase()}`);
  const procPackageId = await ensureBaselineProcPackage(
    client,
    projectId,
    "4100",
    `Runko-urakka ${label.toUpperCase()}`,
    workPackageId
  );
  const itemsByCode = await ensureBaselineTargetEstimateItems(client, targetBatchId);
  const mappingVersionId = await ensureBaselineItemMappingVersion(client, projectId, targetBatchId);
  const primaryItemId = itemsByCode["4101001"] ?? Object.values(itemsByCode)[0];
  if (primaryItemId) {
    await ensureBaselineItemRowMappings(client, mappingVersionId, primaryItemId, workPackageId, procPackageId);
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
