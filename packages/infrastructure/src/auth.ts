import type { AuthPort, LoginInput, LoginResult } from "@ennuste/application";
import type { SessionUser } from "@ennuste/shared";
import { AuthError } from "@ennuste/shared";
import { query } from "./db";

const SESSION_TABLE_WARNING = "Session storage is stateless; logout clears cookie only.";

export const authRepository = (): AuthPort => ({
  async loginWithPin(input: LoginInput): Promise<LoginResult> {
    const userResult = await query<{
      user_id: string;
      username: string;
      display_name: string | null;
    }>(
      "SELECT user_id, username, display_name FROM users WHERE username = $1 AND is_active = true AND pin_hash IS NOT NULL AND pin_hash = crypt($2, pin_hash)",
      [input.username, input.pin]
    );

    const user = userResult.rows[0];
    if (!user) {
      throw new AuthError("Virheellinen tunnus tai PIN");
    }

    let projectId = input.projectId ?? null;
    if (projectId) {
      const allowed = await query<{ allowed: boolean }>(
        "SELECT rbac_user_has_permission($1::uuid, $2::text, 'REPORT_READ') AS allowed",
        [projectId, user.username]
      );
      if (!allowed.rows[0]?.allowed) {
        throw new AuthError("Ei oikeutta projektiin");
      }
    }

    if (!projectId) {
      const projectResult = await query<{ project_id: string; organization_id: string }>(
        "SELECT p.project_id, p.organization_id FROM v_rbac_user_project_permissions v JOIN projects p ON p.project_id = v.project_id WHERE v.username = $1 LIMIT 1",
        [user.username]
      );
      projectId = projectResult.rows[0]?.project_id ?? null;
    }

    if (!projectId) {
      throw new AuthError("Kayttajalla ei ole yhtaan projektia");
    }

    const orgResult = await query<{ organization_id: string }>(
      "SELECT organization_id FROM projects WHERE project_id = $1",
      [projectId]
    );

    const organizationId = orgResult.rows[0]?.organization_id;
    if (!organizationId) {
      throw new AuthError("Projektin organisaatiota ei loytynyt");
    }

    const permissionsResult = await query<{ permission_code: string }>(
      "SELECT permission_code FROM v_rbac_user_project_permissions WHERE project_id = $1::uuid AND username = $2::text",
      [projectId, user.username]
    );

    const session: SessionUser = {
      userId: user.user_id,
      username: user.username,
      displayName: user.display_name,
      organizationId,
      projectId,
      permissions: permissionsResult.rows.map((row) => row.permission_code as SessionUser["permissions"][number])
    };

    return { session };
  },
  async getSession() {
    throw new Error(SESSION_TABLE_WARNING);
  },
  async createSession() {
    throw new Error(SESSION_TABLE_WARNING);
  },
  async deleteSession() {
    throw new Error(SESSION_TABLE_WARNING);
  }
});
