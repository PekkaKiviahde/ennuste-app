import type { PermissionCode } from "@ennuste/shared";
import type { RbacPort } from "@ennuste/application";
import { ForbiddenError } from "@ennuste/shared";
import { query } from "./db";

export const rbacRepository = (): RbacPort => ({
  async requirePermission(projectId, username, permission) {
    const result = await query<{ allowed: boolean }>(
      "SELECT rbac_user_has_permission($1::uuid, $2::text, $3::text) AS allowed",
      [projectId, username, permission]
    );

    if (!result.rows[0]?.allowed) {
      throw new ForbiddenError("Ei oikeuksia");
    }
  },
  async listPermissions(projectId, username) {
    const result = await query<{ permission_code: PermissionCode }>(
      "SELECT permission_code FROM v_rbac_user_project_permissions WHERE project_id = $1::uuid AND username = $2::text",
      [projectId, username]
    );

    return result.rows.map((row) => row.permission_code);
  }
});
