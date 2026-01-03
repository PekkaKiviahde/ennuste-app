import type { AuditPort } from "@ennuste/application";
import { query } from "./db";

export const auditRepository = (): AuditPort => ({
  async recordEvent(input) {
    await query(
      "INSERT INTO app_audit_log (project_id, actor, action, payload) VALUES ($1::uuid, $2::text, $3::text, $4::jsonb)",
      [input.projectId, input.actor, input.action, input.payload]
    );
  }
});
