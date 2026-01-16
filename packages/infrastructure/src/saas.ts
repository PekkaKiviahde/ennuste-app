import { createHash, randomBytes } from "node:crypto";
import type { SaasPort } from "@ennuste/application";
import { AppError } from "@ennuste/shared";
import { pool, query } from "./db";

const hashToken = (token: string) =>
  createHash("sha256").update(token, "utf8").digest("hex");

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const saasRepository = (): SaasPort => ({
  async createGroup(input) {
    const baseSlug = slugify(input.name);
    if (!baseSlug) {
      throw new AppError("Nimi on virheellinen.");
    }

    const tryInsert = async (slug: string) =>
      query<{ group_id: string }>(
        "INSERT INTO groups (name, slug, is_implicit, created_by) VALUES ($1, $2, false, $3) RETURNING group_id",
        [input.name.trim(), slug, input.createdBy]
      );

    try {
      const result = await tryInsert(baseSlug);
      return { groupId: result.rows[0].group_id };
    } catch (error: any) {
      if (error?.code !== "23505") {
        throw error;
      }
      const fallbackSlug = `${baseSlug}-${randomBytes(4).toString("hex")}`;
      const result = await tryInsert(fallbackSlug);
      return { groupId: result.rows[0].group_id };
    }
  },

  async createOrganizationWithInvite(input) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const orgName = input.name.trim();
      const orgSlug = input.slug.trim();
      const adminEmail = normalizeEmail(input.adminEmail);

      let groupId: string | null = input.groupId ?? null;
      let groupCreated = false;
      let organizationCreated = false;
      let demoProjectCreated = false;
      let tenantId: string;
      let organizationId: string;
      let demoProjectId: string;

      const existingOrg = await client.query<{ organization_id: string; group_id: string | null }>(
        "SELECT organization_id, group_id FROM organizations WHERE slug = $1 LIMIT 1",
        [orgSlug]
      );

      const ensureGroupExists = async (id: string) => {
        const found = await client.query("SELECT 1 FROM groups WHERE group_id = $1::uuid", [id]);
        if (found.rowCount === 0) {
          throw new AppError("Konsernia ei loydy.");
        }
      };

      const createImplicitGroup = async () => {
        const baseSlug = slugify(`${orgSlug}-oma-konserni`) || randomBytes(8).toString("hex");
        const name = `Oma konserni – ${orgName}`;

        const tryInsert = async (slug: string) =>
          client.query<{ group_id: string }>(
            "INSERT INTO groups (name, slug, is_implicit, created_by) VALUES ($1, $2, true, $3) RETURNING group_id",
            [name, slug, input.createdBy]
          );

        let created;
        try {
          created = await tryInsert(baseSlug);
        } catch (error: any) {
          if (error?.code !== "23505") {
            throw error;
          }
          created = await tryInsert(`${baseSlug}-${randomBytes(4).toString("hex")}`);
        }
        groupCreated = true;
        return created.rows[0].group_id;
      };

      if (existingOrg.rows.length === 0) {
        if (groupId) {
          await ensureGroupExists(groupId);
        } else {
          groupId = await createImplicitGroup();
        }

        const tenantResult = await client.query<{ tenant_id: string }>(
          "INSERT INTO tenants (name, created_by) VALUES ($1, $2) RETURNING tenant_id",
          [orgName, input.createdBy]
        );
        tenantId = tenantResult.rows[0].tenant_id;

        const orgResult = await client.query<{ organization_id: string }>(
          `INSERT INTO organizations (group_id, name, slug, created_by)
           VALUES ($1, $2, $3, $4)
           RETURNING organization_id`,
          [groupId, orgName, orgSlug, input.createdBy]
        );
        organizationId = orgResult.rows[0].organization_id;
        organizationCreated = true;

        const projectName = `Demo – ${orgName}`;
        const projectResult = await client.query<{ project_id: string }>(
          `INSERT INTO projects (name, customer, organization_id, tenant_id, project_state, project_details, is_demo)
           VALUES ($1, $2, $3, $4, 'P0_PROJECT_DRAFT', $5, true)
           RETURNING project_id`,
          [projectName, orgName, organizationId, tenantId, { demo: true }]
        );
        demoProjectId = projectResult.rows[0].project_id;
        demoProjectCreated = true;
      } else {
        organizationId = existingOrg.rows[0].organization_id;
        const currentGroupId = existingOrg.rows[0].group_id ?? null;

        if (groupId && currentGroupId && groupId !== currentGroupId) {
          throw new AppError("Yhtio on jo luotu eri konserniin.", "ORG_GROUP_MISMATCH", 409);
        }

        if (groupId) {
          await ensureGroupExists(groupId);
        } else {
          groupId = currentGroupId;
          if (!groupId) {
            groupId = await createImplicitGroup();
            await client.query(
              "UPDATE organizations SET group_id = $1::uuid WHERE organization_id = $2::uuid AND group_id IS NULL",
              [groupId, organizationId]
            );
          }
        }

        const projectContext = await client.query<{ tenant_id: string }>(
          "SELECT tenant_id FROM projects WHERE organization_id = $1::uuid ORDER BY created_at DESC LIMIT 1",
          [organizationId]
        );
        const existingTenantId = projectContext.rows[0]?.tenant_id ?? null;
        if (!existingTenantId) {
          throw new AppError("Yhtion tenant puuttuu.");
        }
        tenantId = existingTenantId;

        const demoResult = await client.query<{ project_id: string }>(
          "SELECT project_id FROM projects WHERE organization_id = $1::uuid AND is_demo = true AND archived_at IS NULL ORDER BY created_at DESC LIMIT 1",
          [organizationId]
        );
        if (demoResult.rows.length > 0) {
          demoProjectId = demoResult.rows[0].project_id;
        } else {
          const projectName = `Demo – ${orgName}`;
          const projectResult = await client.query<{ project_id: string }>(
            `INSERT INTO projects (name, customer, organization_id, tenant_id, project_state, project_details, is_demo)
             VALUES ($1, $2, $3, $4, 'P0_PROJECT_DRAFT', $5, true)
             RETURNING project_id`,
            [projectName, orgName, organizationId, tenantId, { demo: true }]
          );
          demoProjectId = projectResult.rows[0].project_id;
          demoProjectCreated = true;
        }
      }

      const revoked = await client.query<{ invite_id: string }>(
        `UPDATE org_invites
         SET revoked_at = now()
         WHERE organization_id = $1::uuid
           AND email = $2::text
           AND redeemed_at IS NULL
           AND revoked_at IS NULL
         RETURNING invite_id`,
        [organizationId, adminEmail]
      );
      const revokedInviteIds = revoked.rows.map((row) => row.invite_id);

      const token = randomBytes(32).toString("hex");
      const tokenHash = hashToken(token);
      const inviteResult = await client.query<{ invite_id: string }>(
        `INSERT INTO org_invites
         (organization_id, email, role_to_grant, token_hash, expires_at, created_by)
         VALUES ($1, $2, 'ORG_ADMIN', $3, now() + interval '7 days', $4)
         RETURNING invite_id`,
        [organizationId, adminEmail, tokenHash, input.createdBy]
      );

      await client.query("COMMIT");
      return {
        organizationId,
        tenantId,
        projectId: demoProjectId,
        inviteId: inviteResult.rows[0].invite_id,
        inviteToken: token,
        groupId,
        created: {
          groupCreated,
          organizationCreated,
          demoProjectCreated
        },
        revokedInviteIds
      };
    } catch (error: any) {
      await client.query("ROLLBACK");
      if (error?.code === "23505") {
        throw new AppError("Uniikkiysvirhe (slug tai token). Yrita uudelleen.");
      }
      throw error;
    } finally {
      client.release();
    }
  },

  async createOrgInvite(input) {
    const email = normalizeEmail(input.email);
    const token = randomBytes(32).toString("hex");
    const tokenHash = hashToken(token);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const revoked = await client.query<{ invite_id: string }>(
        `UPDATE org_invites
         SET revoked_at = now()
         WHERE organization_id = $1::uuid
           AND email = $2::text
           AND redeemed_at IS NULL
           AND revoked_at IS NULL
         RETURNING invite_id`,
        [input.organizationId, email]
      );
      const revokedInviteIds = revoked.rows.map((row) => row.invite_id);

      const result = await client.query<{ invite_id: string }>(
        `INSERT INTO org_invites
         (organization_id, email, role_to_grant, token_hash, expires_at, created_by)
         VALUES ($1, $2, $3, $4, now() + interval '7 days', $5)
         RETURNING invite_id`,
        [input.organizationId, email, input.roleCode ?? "ORG_ADMIN", tokenHash, input.createdBy]
      );

      await client.query("COMMIT");
      return { inviteId: result.rows[0].invite_id, inviteToken: token, revokedInviteIds };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
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
        role_to_grant: string;
        expires_at: string;
        redeemed_at: string | null;
        revoked_at: string | null;
      }>(
        `SELECT invite_id, organization_id, email, role_to_grant, expires_at, redeemed_at, revoked_at
         FROM org_invites
         WHERE token_hash=$1
         LIMIT 1`,
        [tokenHash]
      );
      const invite = inviteResult.rows[0];
      if (!invite) {
        throw new AppError("Kutsulinkki on vanhentunut tai virheellinen.");
      }
      if (invite.revoked_at) {
        throw new AppError("Kutsulinkki on peruttu.", "INVITE_REVOKED", 403);
      }
      if (invite.redeemed_at) {
        throw new AppError("Kutsulinkki on jo kaytetty.", "INVITE_REDEEMED", 409);
      }
      if (new Date(invite.expires_at).getTime() <= Date.now()) {
        const projectForAudit = await client.query<{ project_id: string }>(
          "SELECT project_id FROM projects WHERE organization_id=$1 AND archived_at IS NULL ORDER BY is_demo DESC, created_at DESC LIMIT 1",
          [invite.organization_id]
        );
        const projectId = projectForAudit.rows[0]?.project_id ?? null;
        if (projectId) {
          await client.query("INSERT INTO app_audit_log (project_id, actor, action, payload) VALUES ($1, $2, $3, $4)", [
            projectId,
            invite.email.toLowerCase(),
            "invite.expired",
            { organization_id: invite.organization_id, invite_id: invite.invite_id }
          ]);
        }
        throw new AppError("Kutsulinkki on vanhentunut.", "INVITE_EXPIRED", 410);
      }

      const email = invite.email.toLowerCase();
      const username = email;
      let userId: string | null = null;
      const userResult = await client.query<{ user_id: string; pin_hash: string | null }>(
        "SELECT user_id, pin_hash FROM users WHERE username=$1 AND is_active = true",
        [username]
      );
      if (userResult.rows.length > 0) {
        userId = userResult.rows[0].user_id;
        const pinHash = userResult.rows[0].pin_hash;
        if (pinHash) {
          const pinOk = await client.query<{ ok: boolean }>(
            "SELECT (crypt($1, $2) = $2) AS ok",
            [input.pin, pinHash]
          );
          if (!pinOk.rows[0]?.ok) {
            throw new AppError("Virheellinen PIN.");
          }
        } else {
          await client.query("UPDATE users SET pin_hash = crypt($1, gen_salt('bf')) WHERE user_id = $2::uuid", [
            input.pin,
            userId
          ]);
        }
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
        [invite.organization_id, userId, invite.role_to_grant]
      );
      if (orgRoleExists.rowCount === 0) {
        await client.query(
          `INSERT INTO organization_role_assignments
           (organization_id, user_id, role_code, granted_by)
           VALUES ($1, $2, $3, $4)`,
          [invite.organization_id, userId, invite.role_to_grant, username]
        );
      }

      const projectResult = await client.query<{ project_id: string; tenant_id: string }>(
        `SELECT project_id, tenant_id
         FROM projects
         WHERE organization_id=$1
           AND archived_at IS NULL
         ORDER BY is_demo DESC, created_at DESC
         LIMIT 1`,
        [invite.organization_id]
      );
      if (projectResult.rows.length > 0) {
        const projectId = projectResult.rows[0].project_id;
        const projectRoleExists = await client.query(
          `SELECT 1
           FROM project_role_assignments
           WHERE project_id=$1 AND user_id=$2 AND role_code='PROJECT_OWNER' AND revoked_at IS NULL`,
          [projectId, userId]
        );
        if (projectRoleExists.rowCount === 0) {
          await client.query(
            `INSERT INTO project_role_assignments
             (project_id, user_id, role_code, granted_by)
             VALUES ($1, $2, 'PROJECT_OWNER', $3)`,
            [projectId, userId, username]
          );
        }

        await client.query("INSERT INTO app_audit_log (project_id, actor, action, payload) VALUES ($1, $2, $3, $4)", [
          projectId,
          username,
          "invite.accepted",
          { organization_id: invite.organization_id, invite_id: invite.invite_id, user_id: userId }
        ]);
        await client.query("INSERT INTO app_audit_log (project_id, actor, action, payload) VALUES ($1, $2, $3, $4)", [
          projectId,
          username,
          "role.granted",
          { scope: "organization", organization_id: invite.organization_id, user_id: userId, role_code: invite.role_to_grant }
        ]);
        await client.query("INSERT INTO app_audit_log (project_id, actor, action, payload) VALUES ($1, $2, $3, $4)", [
          projectId,
          username,
          "role.granted",
          { scope: "project", project_id: projectId, user_id: userId, role_code: "PROJECT_OWNER" }
        ]);
      }

      await client.query(
        "UPDATE org_invites SET redeemed_at=now() WHERE invite_id=$1",
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
