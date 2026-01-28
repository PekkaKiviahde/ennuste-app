import type { ReportPort, WorkflowStatus } from "@ennuste/application";
import { dbForTenant } from "./db";
import { selectEffectivePlanningRows } from "./planning-selection";

type WorkflowPlanningRow = NonNullable<WorkflowStatus["planning"]> & {
  planning_event_id?: string | null;
};

const loadPlanningCurrent = async (tenantDb: ReturnType<typeof dbForTenant>, projectId: string) => {
  const result = await tenantDb.query<WorkflowPlanningRow>(
    "SELECT * FROM planning_events WHERE project_id = $1::uuid ORDER BY event_time DESC, planning_event_id DESC",
    [projectId]
  );
  return selectEffectivePlanningRows(result.rows);
};

export const reportRepository = (): ReportPort => ({
  async getDashboard(projectId, tenantId) {
    const tenantDb = dbForTenant(tenantId);
    await tenantDb.requireProject(projectId);
    const result = await tenantDb.query("SELECT * FROM v_report_project_current WHERE project_id = $1::uuid", [projectId]);
    return result.rows[0] ?? null;
  },
  async getWorkPackageReport(projectId, tenantId) {
    const tenantDb = dbForTenant(tenantId);
    await tenantDb.requireProject(projectId);
    const result = await tenantDb.query(
      "SELECT * FROM v_report_work_phase_current WHERE project_id = $1::uuid ORDER BY work_phase_name",
      [projectId]
    );
    return result.rows;
  },
  async getWorkPackageComposition(projectId, tenantId) {
    const tenantDb = dbForTenant(tenantId);
    await tenantDb.requireProject(projectId);
    const result = await tenantDb.query(
      `
      WITH latest_batch AS (
        SELECT id
        FROM import_batches
        WHERE project_id = $1::uuid AND kind = 'TARGET_ESTIMATE'
        ORDER BY created_at DESC
        LIMIT 1
      )
      SELECT
        tei.id AS target_estimate_item_id,
        wp.id AS work_package_id,
        wp.code AS work_package_code,
        wp.name AS work_package_name,
        pp.id AS proc_package_id,
        pp.code AS proc_package_code,
        pp.name AS proc_package_name,
        tei.littera_code,
        tei.item_code,
        tei.description AS item_desc,
        tei.sum_eur AS total_eur
      FROM target_estimate_items tei
      JOIN v_current_item_mappings m
        ON m.target_estimate_item_id = tei.id
       AND m.project_id = $1::uuid
       AND m.import_batch_id = tei.import_batch_id
      JOIN work_packages wp
        ON wp.id = m.work_package_id
      LEFT JOIN proc_packages pp
        ON pp.id = m.proc_package_id
      WHERE tei.import_batch_id IN (SELECT id FROM latest_batch)
        AND COALESCE(tei.sum_eur, 0) <> 0
      ORDER BY wp.code, wp.name, tei.littera_code, tei.item_code
      `,
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
    return loadPlanningCurrent(tenantDb, projectId);
  },
  async getTargetEstimate(projectId, tenantId) {
    const tenantDb = dbForTenant(tenantId);
    await tenantDb.requireProject(projectId);
    const result = await tenantDb.query(
      `
      WITH latest_batch AS (
        SELECT id
        FROM import_batches
        WHERE project_id = $1::uuid AND kind = 'TARGET_ESTIMATE'
        ORDER BY created_at DESC
        LIMIT 1
      )
      SELECT
        bl.target_littera_id,
        l.code AS littera_code,
        l.title AS littera_title,
        bl.cost_type,
        bl.amount,
        bl.valid_from,
        bl.valid_to
      FROM budget_lines bl
      JOIN litteras l
        ON l.project_id = bl.project_id
       AND l.littera_id = bl.target_littera_id
      WHERE bl.project_id = $1::uuid
        AND (
          NOT EXISTS (SELECT 1 FROM latest_batch)
          OR bl.import_batch_id IN (SELECT id FROM latest_batch)
        )
      ORDER BY l.code, bl.cost_type, bl.valid_from DESC
      `,
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
  async getAuditLog(projectId, tenantId, actionFilter) {
    const tenantDb = dbForTenant(tenantId);
    await tenantDb.requireProject(projectId);
    const actionList = actionFilter && actionFilter.length > 0 ? actionFilter : null;
    const result = await tenantDb.query(
      "SELECT * FROM app_audit_log WHERE project_id = $1::uuid AND ($2::text[] IS NULL OR action = ANY($2::text[])) ORDER BY event_time DESC",
      [projectId, actionList]
    );
    return result.rows;
  },
  async getWorkflowStatus(projectId, tenantId) {
    const tenantDb = dbForTenant(tenantId);
    await tenantDb.requireProject(projectId);

    const planningRows = await loadPlanningCurrent(tenantDb, projectId);
    const planning = planningRows[0] ?? null;

    const isLocked = planning?.status === "LOCKED";

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

    const forecast = forecastResult.rows[0] ?? null;
    const audit = auditResult.rows[0] ?? null;

    return {
      planning,
      forecast,
      audit,
      isLocked
    };
  }
});
