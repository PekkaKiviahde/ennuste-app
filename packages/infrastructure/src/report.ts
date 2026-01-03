import type { ReportPort } from "@ennuste/application";
import { dbForTenant } from "./db";

export const reportRepository = (): ReportPort => ({
  async getDashboard(projectId, tenantId) {
    const tenantDb = dbForTenant(tenantId);
    await tenantDb.requireProject(projectId);
    const result = await tenantDb.query("SELECT * FROM v_report_project_current WHERE project_id = $1::uuid", [projectId]);
    return result.rows[0] ?? null;
  },
  async getWorkPhaseReport(projectId, tenantId) {
    const tenantDb = dbForTenant(tenantId);
    await tenantDb.requireProject(projectId);
    const result = await tenantDb.query(
      "SELECT * FROM v_report_work_phase_current WHERE project_id = $1::uuid ORDER BY work_phase_name",
      [projectId]
    );
    return result.rows;
  },
  async getForecastReport(projectId, tenantId) {
    const tenantDb = dbForTenant(tenantId);
    await tenantDb.requireProject(projectId);
    const result = await tenantDb.query(
      "SELECT * FROM v_report_forecast_current WHERE project_id = $1::uuid ORDER BY event_time DESC",
      [projectId]
    );
    return result.rows;
  },
  async getPlanningReport(projectId, tenantId) {
    const tenantDb = dbForTenant(tenantId);
    await tenantDb.requireProject(projectId);
    const result = await tenantDb.query(
      "SELECT * FROM v_report_planning_current WHERE project_id = $1::uuid ORDER BY event_time DESC",
      [projectId]
    );
    return result.rows;
  },
  async getTargetEstimate(projectId, tenantId) {
    const tenantDb = dbForTenant(tenantId);
    await tenantDb.requireProject(projectId);
    const result = await tenantDb.query(
      "SELECT bl.target_littera_id, l.code AS littera_code, l.title AS littera_title, bl.cost_type, bl.amount, bl.valid_from, bl.valid_to FROM budget_lines bl JOIN litteras l ON l.project_id = bl.project_id AND l.littera_id = bl.target_littera_id WHERE bl.project_id = $1::uuid ORDER BY l.code, bl.cost_type, bl.valid_from DESC",
      [projectId]
    );
    return result.rows;
  },
  async getMappingVersions(projectId, tenantId) {
    const tenantDb = dbForTenant(tenantId);
    await tenantDb.requireProject(projectId);
    const result = await tenantDb.query(
      "SELECT mapping_version_id, status, valid_from, valid_to, reason, created_at, created_by, approved_at, approved_by FROM mapping_versions WHERE project_id = $1::uuid ORDER BY created_at DESC",
      [projectId]
    );
    return result.rows;
  },
  async getMappingLines(projectId, tenantId) {
    const tenantDb = dbForTenant(tenantId);
    await tenantDb.requireProject(projectId);
    const result = await tenantDb.query(
      "SELECT ml.mapping_line_id, mv.status AS mapping_status, wl.code AS work_code, wl.title AS work_title, tl.code AS target_code, tl.title AS target_title, ml.allocation_rule, ml.allocation_value, ml.cost_type FROM mapping_lines ml JOIN mapping_versions mv ON mv.mapping_version_id = ml.mapping_version_id JOIN litteras wl ON wl.project_id = ml.project_id AND wl.littera_id = ml.work_littera_id JOIN litteras tl ON tl.project_id = ml.project_id AND tl.littera_id = ml.target_littera_id WHERE ml.project_id = $1::uuid ORDER BY mv.status, tl.code, wl.code",
      [projectId]
    );
    return result.rows;
  },
  async getAuditLog(projectId, tenantId) {
    const tenantDb = dbForTenant(tenantId);
    await tenantDb.requireProject(projectId);
    const result = await tenantDb.query(
      "SELECT * FROM app_audit_log WHERE project_id = $1::uuid ORDER BY event_time DESC",
      [projectId]
    );
    return result.rows;
  },
  async getWorkflowStatus(projectId, tenantId) {
    const tenantDb = dbForTenant(tenantId);
    await tenantDb.requireProject(projectId);

    const planningResult = await tenantDb.query<{
      target_littera_id: string | null;
      status: string | null;
      event_time: string | null;
      created_by: string | null;
      summary: string | null;
    }>(
      "SELECT target_littera_id, status, event_time, created_by, summary FROM planning_events WHERE project_id = $1::uuid ORDER BY event_time DESC LIMIT 1",
      [projectId]
    );

    const forecastResult = await tenantDb.query<{
      target_littera_id: string | null;
      event_time: string | null;
      created_by: string | null;
    }>(
      "SELECT target_littera_id, event_time, created_by FROM v_report_forecast_current WHERE project_id = $1::uuid ORDER BY event_time DESC LIMIT 1",
      [projectId]
    );

    const auditResult = await tenantDb.query<{
      action: string | null;
      actor: string | null;
      event_time: string | null;
    }>(
      "SELECT action, actor, event_time FROM app_audit_log WHERE project_id = $1::uuid ORDER BY event_time DESC LIMIT 1",
      [projectId]
    );

    const planning = planningResult.rows[0] ?? null;
    const forecast = forecastResult.rows[0] ?? null;
    const audit = auditResult.rows[0] ?? null;

    return {
      planning,
      forecast,
      audit,
      isLocked: planning?.status === "LOCKED"
    };
  }
});
