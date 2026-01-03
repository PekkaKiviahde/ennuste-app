import type { AdminPort } from "@ennuste/application";
import { dbForTenant } from "./db";

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
  }
});
