import type { PlanningPort } from "@ennuste/application";
import { dbForTenant } from "./db";
import { selectEffectivePlanningRows, type PlanningRow } from "./planning-selection";

export const planningRepository = (): PlanningPort => ({
  async createPlanningEvent(input) {
    const tenantDb = dbForTenant(input.tenantId);
    await tenantDb.requireProject(input.projectId);
    const result = await tenantDb.query<{ planning_event_id: string }>(
      `
        INSERT INTO planning_events (
          project_id,
          target_littera_id,
          status,
          summary,
          observations,
          risks,
          decisions,
          created_by
        ) VALUES ($1::uuid, $2::uuid, $3::plan_status, $4, $5, $6, $7, $8)
        RETURNING planning_event_id
      `,
      [
        input.projectId,
        input.targetLitteraId,
        input.status,
        input.summary ?? null,
        input.observations ?? null,
        input.risks ?? null,
        input.decisions ?? null,
        input.createdBy
      ]
    );

    return { planningEventId: result.rows[0].planning_event_id };
  },
  async listPlanningCurrent(projectId, tenantId) {
    const tenantDb = dbForTenant(tenantId);
    await tenantDb.requireProject(projectId);
    const result = await tenantDb.query<PlanningRow>(
      "SELECT * FROM planning_events WHERE project_id = $1::uuid ORDER BY event_time DESC, planning_event_id DESC",
      [projectId]
    );
    return selectEffectivePlanningRows(result.rows);
  },
  async getLatestPlanningStatus(projectId, tenantId, targetLitteraId) {
    const tenantDb = dbForTenant(tenantId);
    await tenantDb.requireProject(projectId);
    const result = await tenantDb.query<{ status: "DRAFT" | "READY_FOR_FORECAST" | "LOCKED" }>(
      "SELECT status FROM planning_events WHERE project_id = $1::uuid AND target_littera_id = $2::uuid ORDER BY event_time DESC LIMIT 1",
      [projectId, targetLitteraId]
    );
    return result.rows[0] ?? null;
  }
});
