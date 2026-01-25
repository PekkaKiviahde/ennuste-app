import { Client } from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL puuttuu");
  process.exit(1);
}

if (process.env.ADMIN_MODE !== "true") {
  console.error("ADMIN_MODE=true vaaditaan dev/demo-resettiin");
  process.exit(1);
}

if (process.env.NODE_ENV === "production") {
  console.error("Admin-reset ei ole sallittu tuotannossa");
  process.exit(1);
}

const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "admin@demo.local";
const ADMIN_PIN = process.env.ADMIN_PIN ?? "1234";
const ADMIN_DISPLAY_NAME = process.env.ADMIN_DISPLAY_NAME ?? "Admin";
const SYSTEM_ACTOR = "admin-mode-reset";

const parseDbId = (urlValue) => {
  try {
    const url = new URL(urlValue);
    const host = url.hostname || "unknown-host";
    const dbName = url.pathname?.replace("/", "") || "unknown-db";
    return `${host}/${dbName}`;
  } catch {
    return "unknown-host/unknown-db";
  }
};

const getMixedDemoOrgCount = async (client) => {
  const result = await client.query(
    `
    WITH org_summary AS (
      SELECT organization_id, bool_or(is_demo) AS has_demo, bool_and(is_demo) AS all_demo
      FROM projects
      GROUP BY organization_id
    )
    SELECT count(*)::int AS mixed_count
    FROM org_summary
    WHERE has_demo = true AND all_demo = false
    `
  );
  return result.rows[0]?.mixed_count ?? 0;
};

const getDemoProjects = async (client) => {
  const result = await client.query(
    `
    WITH demo_orgs AS (
      SELECT organization_id
      FROM projects
      GROUP BY organization_id
      HAVING bool_or(is_demo) = true AND bool_and(is_demo) = true
    )
    SELECT project_id, tenant_id, organization_id
    FROM projects
    WHERE is_demo = true
      AND organization_id IN (SELECT organization_id FROM demo_orgs)
    ORDER BY project_id
    `
  );
  return result.rows;
};

const getNonDemoActiveCounts = async (client) => {
  const result = await client.query(
    `
    WITH non_demo_orgs AS (
      SELECT DISTINCT organization_id
      FROM projects
      WHERE is_demo = false
    ),
    non_demo_projects AS (
      SELECT project_id
      FROM projects
      WHERE is_demo = false
    )
    SELECT
      (
        SELECT count(*)::int
        FROM organization_memberships membership
        WHERE membership.left_at IS NULL
          AND membership.organization_id IN (SELECT organization_id FROM non_demo_orgs)
      ) AS memberships,
      (
        SELECT count(*)::int
        FROM organization_role_assignments ora
        WHERE ora.revoked_at IS NULL
          AND ora.organization_id IN (SELECT organization_id FROM non_demo_orgs)
      ) AS org_roles,
      (
        SELECT count(*)::int
        FROM project_role_assignments pra
        WHERE pra.revoked_at IS NULL
          AND pra.project_id IN (SELECT project_id FROM non_demo_projects)
      ) AS project_roles
    `
  );
  return result.rows[0] ?? { memberships: 0, org_roles: 0, project_roles: 0 };
};

const getDemoUsersToDeactivate = async (client, adminUserId) => {
  const result = await client.query(
    `
    WITH demo_orgs AS (
      SELECT organization_id
      FROM projects
      GROUP BY organization_id
      HAVING bool_or(is_demo) = true AND bool_and(is_demo) = true
    ),
    demo_projects AS (
      SELECT project_id
      FROM projects
      WHERE is_demo = true
        AND organization_id IN (SELECT organization_id FROM demo_orgs)
    ),
    demo_users AS (
      SELECT user_id
      FROM organization_memberships
      WHERE left_at IS NULL
        AND organization_id IN (SELECT organization_id FROM demo_orgs)
      UNION
      SELECT user_id
      FROM organization_role_assignments
      WHERE revoked_at IS NULL
        AND organization_id IN (SELECT organization_id FROM demo_orgs)
      UNION
      SELECT user_id
      FROM project_role_assignments
      WHERE revoked_at IS NULL
        AND project_id IN (SELECT project_id FROM demo_projects)
    ),
    non_demo_orgs AS (
      SELECT DISTINCT organization_id
      FROM projects
      WHERE is_demo = false
    ),
    non_demo_projects AS (
      SELECT project_id
      FROM projects
      WHERE is_demo = false
    ),
    active_non_demo_users AS (
      SELECT user_id
      FROM organization_memberships
      WHERE left_at IS NULL
        AND organization_id IN (SELECT organization_id FROM non_demo_orgs)
      UNION
      SELECT user_id
      FROM organization_role_assignments
      WHERE revoked_at IS NULL
        AND organization_id IN (SELECT organization_id FROM non_demo_orgs)
      UNION
      SELECT user_id
      FROM project_role_assignments
      WHERE revoked_at IS NULL
        AND project_id IN (SELECT project_id FROM non_demo_projects)
    )
    SELECT DISTINCT du.user_id
    FROM demo_users du
    LEFT JOIN active_non_demo_users nd ON nd.user_id = du.user_id
    WHERE nd.user_id IS NULL
      AND ($1::uuid IS NULL OR du.user_id <> $1::uuid)
    `,
    [adminUserId]
  );
  return result.rows.map((row) => String(row.user_id));
};

const run = async () => {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    const mixedDemoOrgCount = await getMixedDemoOrgCount(client);
    if (mixedDemoOrgCount > 0) {
      throw new Error("Demoprojektien organisaatioissa on ei-demo projekteja. Reset keskeytetty.");
    }

    const demoProjects = await getDemoProjects(client);
    if (demoProjects.length === 0) {
      throw new Error("Ei demoprojekteja. Resetia ei voi kohdistaa turvallisesti.");
    }

    const nonDemoBefore = await getNonDemoActiveCounts(client);

    await client.query("BEGIN");

    const existingAdmin = await client.query(
      "SELECT user_id FROM users WHERE username = $1 LIMIT 1",
      [ADMIN_USERNAME]
    );
    const existingAdminUserId = existingAdmin.rows[0]?.user_id ?? null;

    const demoUsersToDeactivate = await getDemoUsersToDeactivate(client, existingAdminUserId);

    const revokeSessionsResult = await client.query(
      `
      WITH demo_orgs AS (
        SELECT organization_id
        FROM projects
        GROUP BY organization_id
        HAVING bool_or(is_demo) = true AND bool_and(is_demo) = true
      ),
      demo_projects AS (
        SELECT project_id
        FROM projects
        WHERE is_demo = true
          AND organization_id IN (SELECT organization_id FROM demo_orgs)
      )
      UPDATE sessions s
      SET revoked_at = now()
      FROM demo_projects dp
      WHERE s.project_id = dp.project_id
        AND s.revoked_at IS NULL
        AND ($1::uuid IS NULL OR s.user_id <> $1::uuid)
      `,
      [existingAdminUserId]
    );

    const revokeProjectRolesResult = await client.query(
      `
      WITH demo_orgs AS (
        SELECT organization_id
        FROM projects
        GROUP BY organization_id
        HAVING bool_or(is_demo) = true AND bool_and(is_demo) = true
      ),
      demo_projects AS (
        SELECT project_id
        FROM projects
        WHERE is_demo = true
          AND organization_id IN (SELECT organization_id FROM demo_orgs)
      )
      UPDATE project_role_assignments pra
      SET revoked_at = now(),
          revoked_by = $2
      FROM demo_projects dp
      WHERE pra.project_id = dp.project_id
        AND pra.revoked_at IS NULL
        AND ($1::uuid IS NULL OR pra.user_id <> $1::uuid)
      `,
      [existingAdminUserId, SYSTEM_ACTOR]
    );

    const revokeOrgRolesResult = await client.query(
      `
      WITH demo_orgs AS (
        SELECT organization_id
        FROM projects
        GROUP BY organization_id
        HAVING bool_or(is_demo) = true AND bool_and(is_demo) = true
      )
      UPDATE organization_role_assignments ora
      SET revoked_at = now(),
          revoked_by = $2
      WHERE ora.organization_id IN (SELECT organization_id FROM demo_orgs)
        AND ora.revoked_at IS NULL
        AND ($1::uuid IS NULL OR ora.user_id <> $1::uuid)
      `,
      [existingAdminUserId, SYSTEM_ACTOR]
    );

    const endMembershipsResult = await client.query(
      `
      WITH demo_orgs AS (
        SELECT organization_id
        FROM projects
        GROUP BY organization_id
        HAVING bool_or(is_demo) = true AND bool_and(is_demo) = true
      )
      UPDATE organization_memberships membership
      SET left_at = now(),
          left_by = $2
      WHERE membership.organization_id IN (SELECT organization_id FROM demo_orgs)
        AND membership.left_at IS NULL
        AND ($1::uuid IS NULL OR membership.user_id <> $1::uuid)
      `,
      [existingAdminUserId, SYSTEM_ACTOR]
    );

    let deactivatedUsersCount = 0;
    if (demoUsersToDeactivate.length > 0) {
      const deactivateUsersResult = await client.query(
        `
        UPDATE users
        SET is_active = false
        WHERE is_active = true
          AND user_id = ANY($1::uuid[])
        `,
        [demoUsersToDeactivate]
      );
      deactivatedUsersCount = deactivateUsersResult.rowCount;
    }

    const adminUserResult = await client.query(
      `
      INSERT INTO users (username, display_name, email, created_by, pin_hash, is_active)
      VALUES ($1, $2, $3, $5, crypt($4, gen_salt('bf')), true)
      ON CONFLICT (username) DO UPDATE
      SET display_name = EXCLUDED.display_name,
          email = EXCLUDED.email,
          pin_hash = EXCLUDED.pin_hash,
          is_active = true
      RETURNING user_id
      `,
      [ADMIN_USERNAME, ADMIN_DISPLAY_NAME, ADMIN_USERNAME, ADMIN_PIN, SYSTEM_ACTOR]
    );
    const adminUserId = adminUserResult.rows[0].user_id;

    await client.query(
      `
      WITH demo_orgs AS (
        SELECT organization_id
        FROM projects
        GROUP BY organization_id
        HAVING bool_or(is_demo) = true AND bool_and(is_demo) = true
      )
      UPDATE sessions s
      SET revoked_at = now()
      FROM demo_orgs demo_org
      JOIN projects demo_project ON demo_project.organization_id = demo_org.organization_id AND demo_project.is_demo = true
      WHERE s.project_id = demo_project.project_id
        AND s.user_id = $1::uuid
        AND s.revoked_at IS NULL
      `,
      [adminUserId]
    );

    const ensureMembershipsResult = await client.query(
      `
      WITH demo_orgs AS (
        SELECT organization_id
        FROM projects
        GROUP BY organization_id
        HAVING bool_or(is_demo) = true AND bool_and(is_demo) = true
      )
      INSERT INTO organization_memberships (organization_id, user_id, joined_by)
      SELECT demo_org.organization_id, $1::uuid, $2
      FROM demo_orgs demo_org
      WHERE NOT EXISTS (
        SELECT 1
        FROM organization_memberships membership
        WHERE membership.organization_id = demo_org.organization_id
          AND membership.user_id = $1::uuid
          AND membership.left_at IS NULL
      )
      `,
      [adminUserId, SYSTEM_ACTOR]
    );

    const ensureOrgAdminRolesResult = await client.query(
      `
      WITH demo_orgs AS (
        SELECT organization_id
        FROM projects
        GROUP BY organization_id
        HAVING bool_or(is_demo) = true AND bool_and(is_demo) = true
      )
      INSERT INTO organization_role_assignments (organization_id, user_id, role_code, granted_by)
      SELECT demo_org.organization_id, $1::uuid, 'ORG_ADMIN', $2
      FROM demo_orgs demo_org
      WHERE NOT EXISTS (
        SELECT 1
        FROM organization_role_assignments ora
        WHERE ora.organization_id = demo_org.organization_id
          AND ora.user_id = $1::uuid
          AND ora.role_code = 'ORG_ADMIN'
          AND ora.revoked_at IS NULL
      )
      `,
      [adminUserId, SYSTEM_ACTOR]
    );

    const pinCheckResult = await client.query(
      `
      SELECT pin_hash = crypt($2, pin_hash) AS pin_ok
      FROM users
      WHERE username = $1
        AND is_active = true
        AND pin_hash IS NOT NULL
      LIMIT 1
      `,
      [ADMIN_USERNAME, ADMIN_PIN]
    );
    const pinOk = Boolean(pinCheckResult.rows[0]?.pin_ok);
    if (!pinOk) {
      throw new Error("Admin-PINin varmistus epaonnistui.");
    }

    const permissionCheckResult = await client.query(
      `
      WITH demo_orgs AS (
        SELECT organization_id
        FROM projects
        GROUP BY organization_id
        HAVING bool_or(is_demo) = true AND bool_and(is_demo) = true
      ),
      demo_projects AS (
        SELECT project_id
        FROM projects
        WHERE is_demo = true
          AND organization_id IN (SELECT organization_id FROM demo_orgs)
      )
      SELECT bool_and(rbac_user_has_permission(project_id, $1::text, 'REPORT_READ')) AS has_report_read
      FROM demo_projects
      `,
      [ADMIN_USERNAME]
    );
    const permissionOk = Boolean(permissionCheckResult.rows[0]?.has_report_read);
    if (!permissionOk) {
      throw new Error("Admin-oikeuksien varmistus epaonnistui.");
    }

    const resetSummary = {
      revokedSessions: revokeSessionsResult.rowCount,
      revokedProjectRoles: revokeProjectRolesResult.rowCount,
      revokedOrgRoles: revokeOrgRolesResult.rowCount,
      endedMemberships: endMembershipsResult.rowCount,
      deactivatedUsers: deactivatedUsersCount,
      demoProjects: demoProjects.length
    };

    for (const project of demoProjects) {
      await client.query(
        "INSERT INTO app_audit_log (project_id, actor, action, payload) VALUES ($1::uuid, $2::text, $3::text, $4::jsonb)",
        [project.project_id, SYSTEM_ACTOR, "admin_identities_reset", JSON.stringify(resetSummary)]
      );
      await client.query(
        "INSERT INTO app_audit_log (project_id, actor, action, payload) VALUES ($1::uuid, $2::text, $3::text, $4::jsonb)",
        [
          project.project_id,
          SYSTEM_ACTOR,
          "admin_created",
          JSON.stringify({ adminUserId, adminMode: true })
        ]
      );
      await client.query(
        "INSERT INTO app_audit_log (project_id, actor, action, payload) VALUES ($1::uuid, $2::text, $3::text, $4::jsonb)",
        [
          project.project_id,
          SYSTEM_ACTOR,
          "admin_login_tested",
          JSON.stringify({ pinOk: true, permissionOk: true })
        ]
      );
    }

    const nonDemoAfter = await getNonDemoActiveCounts(client);
    if (
      nonDemoAfter.memberships !== nonDemoBefore.memberships ||
      nonDemoAfter.org_roles !== nonDemoBefore.org_roles ||
      nonDemoAfter.project_roles !== nonDemoBefore.project_roles
    ) {
      throw new Error("Ei-demo-scope muuttui. Reset perutaan turvallisuussyista.");
    }

    await client.query("COMMIT");

    console.log(
      JSON.stringify({
        db: parseDbId(databaseUrl),
        demoProjects: demoProjects.length,
        nonDemoUnchanged: true,
        reset: resetSummary,
        admin: {
          membershipsAdded: ensureMembershipsResult.rowCount,
          orgAdminRolesAdded: ensureOrgAdminRolesResult.rowCount
        }
      })
    );
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    throw error;
  } finally {
    await client.end();
  }
};

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
