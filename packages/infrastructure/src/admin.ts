import type { AdminPort } from "@ennuste/application";
import { dbForTenant } from "./db";
import { AppError } from "@ennuste/shared";

export const adminRepository = (): AdminPort => ({
  async getAdminOverview(projectId, tenantId) {
    const tenantDb = dbForTenant(tenantId);
    const { organizationId } = await tenantDb.getProjectContext(projectId);
    const usersResult = await tenantDb.query<{ username: string; display_name: string | null }>(
      `
      SELECT DISTINCT u.username, u.display_name
      FROM users u
      JOIN (
        SELECT user_id FROM project_role_assignments WHERE project_id = $1::uuid AND revoked_at IS NULL
        UNION
        SELECT user_id FROM organization_role_assignments WHERE organization_id = $2::uuid AND revoked_at IS NULL
        UNION
        SELECT user_id FROM organization_memberships WHERE organization_id = $2::uuid AND left_at IS NULL
      ) scoped_users ON scoped_users.user_id = u.user_id
      WHERE u.is_active = true
      ORDER BY u.username
      `,
      [projectId, organizationId]
    );

    const rolesResult = await tenantDb.query<{ role_code: string; role_name_fi: string }>(
      "SELECT role_code, role_name_fi FROM roles ORDER BY role_code"
    );

    const assignmentsResult = await tenantDb.query<{
      scope: "project" | "organization";
      username: string;
      role_code: string;
      granted_at: string;
    }>(
      `
      SELECT 'project' AS scope, u.username, pra.role_code, pra.granted_at
      FROM project_role_assignments pra
      JOIN users u ON u.user_id = pra.user_id
      WHERE pra.project_id = $1::uuid AND pra.revoked_at IS NULL
      UNION ALL
      SELECT 'organization' AS scope, u.username, ora.role_code, ora.granted_at
      FROM organization_role_assignments ora
      JOIN users u ON u.user_id = ora.user_id
      WHERE ora.organization_id = $2::uuid AND ora.revoked_at IS NULL
      ORDER BY username
      `,
      [projectId, organizationId]
    );

    return {
      users: usersResult.rows,
      roles: rolesResult.rows,
      assignments: assignmentsResult.rows
    };
  },

  async archiveDemoProject(input) {
    const tenantDb = dbForTenant(input.tenantId);
    await tenantDb.requireProject(input.projectId);
    const { organizationId } = await tenantDb.getProjectContext(input.projectId);

    return tenantDb.transaction(async (client) => {
      const target = await client.query<{
        project_id: string;
        organization_id: string;
        is_demo: boolean;
        archived_at: string | null;
      }>(
        "SELECT project_id, organization_id, is_demo, archived_at FROM projects WHERE project_id = $1::uuid AND tenant_id = $2::uuid",
        [input.demoProjectId, input.tenantId]
      );

      const row = target.rows[0];
      if (!row) {
        throw new AppError("Projektia ei loydy.", "PROJECT_NOT_FOUND", 404);
      }
      if (row.organization_id !== organizationId) {
        throw new AppError("Ei oikeutta projektiin.", "FORBIDDEN", 403);
      }
      if (!row.is_demo) {
        throw new AppError("Vain demoprojekti voidaan arkistoida tassa virrassa.", "NOT_DEMO_PROJECT", 409);
      }
      if (row.archived_at) {
        return { archived: false };
      }

      const updated = await client.query(
        "UPDATE projects SET archived_at = now() WHERE project_id = $1::uuid AND tenant_id = $2::uuid AND archived_at IS NULL",
        [input.demoProjectId, input.tenantId]
      );

      if (updated.rowCount > 0) {
        await client.query(
          "INSERT INTO app_audit_log (project_id, actor, action, payload) VALUES ($1::uuid, $2::text, $3::text, $4::jsonb)",
          [input.demoProjectId, input.username, "project.archived", { project_id: input.demoProjectId, is_demo: true }]
        );
        return { archived: true };
      }

      return { archived: false };
    });
  }
});
