import type { AuthPort, LoginInput, LoginResult, UserProject } from "@ennuste/application";
import type { SessionUser } from "@ennuste/shared";
import { AuthError } from "@ennuste/shared";
import { query } from "./db";

const DEFAULT_MAX_AGE_SECONDS = 60 * 60 * 8;

const hasProjectAccess = async (projectId: string, username: string) => {
  const allowed = await query<{ allowed: boolean }>(
    `
    SELECT
      rbac_user_has_permission($1::uuid, $2::text, 'REPORT_READ')
      OR rbac_user_has_permission($1::uuid, $2::text, 'SELLER_UI')
      AS allowed
    `,
    [projectId, username]
  );
  return Boolean(allowed.rows[0]?.allowed);
};

const loadPermissions = async (projectId: string, username: string) => {
  const permissionsResult = await query<{ permission_code: string }>(
    "SELECT permission_code FROM v_rbac_user_project_permissions WHERE project_id = $1::uuid AND username = $2::text",
    [projectId, username]
  );
  return (permissionsResult.rows as Array<{ permission_code: SessionUser["permissions"][number] }>).map(
    (row) => row.permission_code
  );
};

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
      const allowed = await hasProjectAccess(projectId, user.username);
      if (!allowed) {
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

    const orgResult = await query<{ organization_id: string; tenant_id: string }>(
      "SELECT organization_id, tenant_id FROM projects WHERE project_id = $1",
      [projectId]
    );

    const organizationId = orgResult.rows[0]?.organization_id;
    const tenantId = orgResult.rows[0]?.tenant_id;
    if (!organizationId) {
      throw new AuthError("Projektin organisaatiota ei loytynyt");
    }
    if (!tenantId) {
      throw new AuthError("Projektin tenant puuttuu");
    }

    const permissions = await loadPermissions(projectId, user.username);

    const session: SessionUser = {
      userId: user.user_id,
      username: user.username,
      displayName: user.display_name,
      organizationId,
      tenantId,
      projectId,
      permissions
    };

    return { session };
  },
  async switchProject(input: { username: string; projectId: string }): Promise<LoginResult> {
    const userResult = await query<{
      user_id: string;
      username: string;
      display_name: string | null;
    }>(
      "SELECT user_id, username, display_name FROM users WHERE username = $1 AND is_active = true",
      [input.username]
    );

    const user = userResult.rows[0];
    if (!user) {
      throw new AuthError("Kayttajaa ei loytynyt");
    }

    const allowed = await hasProjectAccess(input.projectId, user.username);
    if (!allowed) {
      throw new AuthError("Ei oikeutta projektiin");
    }

    const orgResult = await query<{ organization_id: string; tenant_id: string }>(
      "SELECT organization_id, tenant_id FROM projects WHERE project_id = $1",
      [input.projectId]
    );

    const organizationId = orgResult.rows[0]?.organization_id;
    const tenantId = orgResult.rows[0]?.tenant_id;
    if (!organizationId) {
      throw new AuthError("Projektin organisaatiota ei loytynyt");
    }
    if (!tenantId) {
      throw new AuthError("Projektin tenant puuttuu");
    }

    const permissions = await loadPermissions(input.projectId, user.username);

    const session: SessionUser = {
      userId: user.user_id,
      username: user.username,
      displayName: user.display_name,
      organizationId,
      tenantId,
      projectId: input.projectId,
      permissions
    };

    return { session };
  },
  async listUserProjects(username: string): Promise<UserProject[]> {
    const result = await query<{
      project_id: string;
      project_name: string;
      organization_id: string;
      organization_name: string;
    }>(
      `
      SELECT DISTINCT
        p.project_id,
        p.name AS project_name,
        o.organization_id,
        o.name AS organization_name
      FROM v_rbac_user_project_permissions v
      JOIN projects p ON p.project_id = v.project_id
      JOIN organizations o ON o.organization_id = p.organization_id
      WHERE v.username = $1
      ORDER BY o.name, p.name
      `,
      [username]
    );

    return result.rows.map((row) => ({
      projectId: row.project_id,
      projectName: row.project_name,
      organizationId: row.organization_id,
      organizationName: row.organization_name
    }));
  },
  async getSession(sessionId: string) {
    const sessionResult = await query<{
      session_id: string;
      user_id: string;
      project_id: string;
      tenant_id: string;
      expires_at: string;
      revoked_at: string | null;
      username: string;
      display_name: string | null;
      organization_id: string;
    }>(
      "SELECT s.session_id, s.user_id, s.project_id, s.tenant_id, s.expires_at, s.revoked_at, u.username, u.display_name, p.organization_id FROM sessions s JOIN users u ON u.user_id = s.user_id JOIN projects p ON p.project_id = s.project_id WHERE s.session_id = $1::uuid AND u.is_active = true",
      [sessionId]
    );

    const sessionRow = sessionResult.rows[0];
    if (!sessionRow) {
      return null;
    }
    if (sessionRow.revoked_at) {
      return null;
    }
    if (new Date(sessionRow.expires_at).getTime() <= Date.now()) {
      return null;
    }

    const permissions = await loadPermissions(sessionRow.project_id, sessionRow.username);

    return {
      userId: sessionRow.user_id,
      username: sessionRow.username,
      displayName: sessionRow.display_name,
      organizationId: sessionRow.organization_id,
      tenantId: sessionRow.tenant_id,
      projectId: sessionRow.project_id,
      permissions
    };
  },
  async createSession(session) {
    const expiresAt = new Date(Date.now() + DEFAULT_MAX_AGE_SECONDS * 1000);
    const result = await query<{ session_id: string }>(
      "INSERT INTO sessions (user_id, project_id, tenant_id, expires_at) VALUES ($1::uuid, $2::uuid, $3::uuid, $4::timestamptz) RETURNING session_id",
      [session.userId, session.projectId, session.tenantId, expiresAt.toISOString()]
    );
    return result.rows[0].session_id;
  },
  async deleteSession(sessionId: string) {
    await query(
      "UPDATE sessions SET revoked_at = now() WHERE session_id = $1::uuid AND revoked_at IS NULL",
      [sessionId]
    );
  }
});
