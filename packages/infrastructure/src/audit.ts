import type { AuditPort } from "@ennuste/application";
import { query } from "./db";
import { requireProjectTenant } from "./tenant";

export const auditRepository = (): AuditPort => ({
  async recordEvent(input) {
    await requireProjectTenant(input.projectId, input.tenantId);
    await query(
      "INSERT INTO app_audit_log (project_id, actor, action, payload) VALUES ($1::uuid, $2::text, $3::text, $4::jsonb)",
      [input.projectId, input.actor, input.action, input.payload]
    );
  }
});
