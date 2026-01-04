import { createHash, randomBytes } from "node:crypto";
import type { SaasPort } from "@ennuste/application";
import { AppError } from "@ennuste/shared";
import { pool, query } from "./db";

const hashToken = (token: string) =>
  createHash("sha256").update(token, "utf8").digest("hex");

export const saasRepository = (): SaasPort => ({
  async createGroup(input) {
    const result = await query<{ group_id: string }>(
      "INSERT INTO groups (name, created_by) VALUES ($1, $2) RETURNING group_id",
      [input.name.trim(), input.createdBy]
    );
    return { groupId: result.rows[0].group_id };
  },

  async createOrganizationWithInvite(input) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const tenantResult = await client.query<{ tenant_id: string }>(
        "INSERT INTO tenants (name, created_by) VALUES ($1, $2) RETURNING tenant_id",
        [input.name.trim(), input.createdBy]
      );
      const tenantId = tenantResult.rows[0].tenant_id;

      const orgResult = await client.query<{ organization_id: string }>(
        `INSERT INTO organizations (group_id, name, slug, created_by)
         VALUES ($1, $2, $3, $4)
         RETURNING organization_id`,
        [input.groupId ?? null, input.name.trim(), input.slug.trim(), input.createdBy]
      );
      const organizationId = orgResult.rows[0].organization_id;

      const projectName = `${input.name.trim()} Demo`;
      const projectResult = await client.query<{ project_id: string }>(
        `INSERT INTO projects (name, customer, organization_id, tenant_id, project_state, project_details)
         VALUES ($1, $2, $3, $4, 'P0_PROJECT_DRAFT', $5)
         RETURNING project_id`,
        [projectName, input.name.trim(), organizationId, tenantId, { demo: true }]
      );
      const projectId = projectResult.rows[0].project_id;

      const token = randomBytes(32).toString("hex");
      const tokenHash = hashToken(token);
      const inviteResult = await client.query<{ invite_id: string }>(
        `INSERT INTO org_invites
         (organization_id, email, role_code, token_hash, expires_at, created_by)
         VALUES ($1, $2, 'ORG_ADMIN', $3, now() + interval '7 days', $4)
         RETURNING invite_id`,
        [organizationId, input.adminEmail.toLowerCase().trim(), tokenHash, input.createdBy]
      );

      await client.query("COMMIT");
      return {
        organizationId,
        tenantId,
        projectId,
        inviteId: inviteResult.rows[0].invite_id,
        inviteToken: token
      };
    } catch (error: any) {
      await client.query("ROLLBACK");
      if (error?.code === "23505") {
        throw new AppError("Slug on jo kaytossa.");
      }
      throw error;
    } finally {
      client.release();
    }
  },

  async createOrgInvite(input) {
    const token = randomBytes(32).toString("hex");
    const tokenHash = hashToken(token);
    const result = await query<{ invite_id: string }>(
      `INSERT INTO org_invites
       (organization_id, email, role_code, token_hash, expires_at, created_by)
       VALUES ($1, $2, $3, $4, now() + interval '7 days', $5)
       RETURNING invite_id`,
      [
        input.organizationId,
        input.email.toLowerCase().trim(),
        input.roleCode ?? "ORG_ADMIN",
        tokenHash,
        input.createdBy
      ]
    );
    return { inviteId: result.rows[0].invite_id, inviteToken: token };
  },

  async acceptInvite(input) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const tokenHash = hashToken(input.token);
      const inviteResult = await client.query<{
        invite_id: string;
        organization_id: string;
        email: string;
        role_code: string;
      }>(
        `SELECT invite_id, organization_id, email, role_code
         FROM org_invites
         WHERE token_hash=$1 AND expires_at > now() AND accepted_at IS NULL
         LIMIT 1`,
        [tokenHash]
      );
      const invite = inviteResult.rows[0];
      if (!invite) {
        throw new AppError("Kutsulinkki on vanhentunut tai virheellinen.");
      }

      const email = invite.email.toLowerCase();
      const username = email;
      let userId: string | null = null;
      const userResult = await client.query<{ user_id: string }>(
        "SELECT user_id FROM users WHERE username=$1",
        [username]
      );
      if (userResult.rows.length > 0) {
        userId = userResult.rows[0].user_id;
      } else {
        const created = await client.query<{ user_id: string }>(
          `INSERT INTO users (username, display_name, email, created_by, pin_hash)
           VALUES ($1, $2, $3, 'invite', crypt($4, gen_salt('bf')))
           RETURNING user_id`,
          [username, input.displayName ?? null, email, input.pin]
        );
        userId = created.rows[0].user_id;
      }

      const membershipExists = await client.query(
        `SELECT 1
         FROM organization_memberships
         WHERE organization_id=$1 AND user_id=$2 AND left_at IS NULL`,
        [invite.organization_id, userId]
      );
      if (membershipExists.rowCount === 0) {
        await client.query(
          `INSERT INTO organization_memberships
           (organization_id, user_id, joined_by)
           VALUES ($1, $2, $3)`,
          [invite.organization_id, userId, username]
        );
      }

      const orgRoleExists = await client.query(
        `SELECT 1
         FROM organization_role_assignments
         WHERE organization_id=$1 AND user_id=$2 AND role_code=$3 AND revoked_at IS NULL`,
        [invite.organization_id, userId, invite.role_code]
      );
      if (orgRoleExists.rowCount === 0) {
        await client.query(
          `INSERT INTO organization_role_assignments
           (organization_id, user_id, role_code, granted_by)
           VALUES ($1, $2, $3, $4)`,
          [invite.organization_id, userId, invite.role_code, username]
        );
      }

      const projectResult = await client.query<{ project_id: string; tenant_id: string }>(
        `SELECT project_id, tenant_id
         FROM projects
         WHERE organization_id=$1
         ORDER BY created_at DESC
         LIMIT 1`,
        [invite.organization_id]
      );
      if (projectResult.rows.length > 0) {
        const projectId = projectResult.rows[0].project_id;
        const projectRoleExists = await client.query(
          `SELECT 1
           FROM project_role_assignments
           WHERE project_id=$1 AND user_id=$2 AND role_code='PRODUCTION_MANAGER' AND revoked_at IS NULL`,
          [projectId, userId]
        );
        if (projectRoleExists.rowCount === 0) {
          await client.query(
            `INSERT INTO project_role_assignments
             (project_id, user_id, role_code, granted_by)
             VALUES ($1, $2, 'PRODUCTION_MANAGER', $3)`,
            [projectId, userId, username]
          );
        }
        await client.query(
          "INSERT INTO app_audit_log (project_id, actor, action, payload) VALUES ($1, $2, $3, $4)",
          [
            projectId,
            username,
            "invite.accept",
            {
              organization_id: invite.organization_id,
              invite_id: invite.invite_id,
              user_id: userId
            }
          ]
        );
      }

      await client.query(
        "UPDATE org_invites SET accepted_at=now() WHERE invite_id=$1",
        [invite.invite_id]
      );

      const projectId = projectResult.rows[0]?.project_id ?? null;
      if (!projectId) {
        throw new AppError("Demoprojektia ei loydy.");
      }

      await client.query("COMMIT");
      return { organizationId: invite.organization_id, projectId, userId };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
});
