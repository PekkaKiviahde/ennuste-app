import type { AdminPort } from "@ennuste/application";
import { query } from "./db";

export const adminRepository = (): AdminPort => ({
  async getAdminOverview(projectId) {
    const usersResult = await query<{ username: string; display_name: string | null }>(
      "SELECT DISTINCT username, display_name FROM users WHERE is_active = true ORDER BY username"
    );

    const rolesResult = await query<{ role_code: string; role_name_fi: string }>(
      "SELECT role_code, role_name_fi FROM roles ORDER BY role_code"
    );

    const assignmentsResult = await query<{
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
      JOIN projects p ON p.organization_id = ora.organization_id
      WHERE p.project_id = $1::uuid AND ora.revoked_at IS NULL
      ORDER BY username
      `,
      [projectId]
    );

    return {
      users: usersResult.rows,
      roles: rolesResult.rows,
      assignments: assignmentsResult.rows
    };
  }
});
