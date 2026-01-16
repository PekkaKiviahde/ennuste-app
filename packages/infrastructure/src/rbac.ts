import type { PermissionCode } from "@ennuste/shared";
import type { RbacPort } from "@ennuste/application";
import { ForbiddenError } from "@ennuste/shared";
import { dbForTenant } from "./db";

export const rbacRepository = (): RbacPort => ({
  async requirePermission(projectId, tenantId, username, permission) {
    const tenantDb = dbForTenant(tenantId);
    await tenantDb.requireProject(projectId);
    const result = await tenantDb.query<{ allowed: boolean }>(
      "SELECT rbac_user_has_permission($1::uuid, $2::text, $3::text) AS allowed",
      [projectId, username, permission]
    );

    if (!result.rows[0]?.allowed) {
      try {
        const actorResult = await tenantDb.query<{ user_id: string }>(
          "SELECT user_id FROM users WHERE username = $1::text AND is_active = true LIMIT 1",
          [username]
        );
        const actorUserId = actorResult.rows[0]?.user_id ?? null;
        await tenantDb.query(
          `INSERT INTO app_audit_log (project_id, actor, actor_user_id, action, payload)
           VALUES ($1::uuid, $2::text, $3::uuid, $4::text, $5::jsonb)`,
          [
            projectId,
            actorUserId ? String(actorUserId) : null,
            actorUserId,
            "rbac.access_denied",
            { permission_code: permission }
          ]
        );
      } catch {
        // ignore audit failures (authorization must still deny)
      }
      throw new ForbiddenError("Ei oikeuksia");
    }
  },
  async listPermissions(projectId, tenantId, username) {
    const tenantDb = dbForTenant(tenantId);
    await tenantDb.requireProject(projectId);
    const result = await tenantDb.query<{ permission_code: PermissionCode }>(
      "SELECT permission_code FROM v_rbac_user_project_permissions WHERE project_id = $1::uuid AND username = $2::text",
      [projectId, username]
    );

    const permissions = (result.rows as Array<{ permission_code: PermissionCode }>).map((row) => row.permission_code);
    return permissions;
  }
});
