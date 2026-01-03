import { ForbiddenError } from "@ennuste/shared";
import { query } from "./db";

export const getProjectContext = async (projectId: string, tenantId: string) => {
  const result = await query<{ organization_id: string }>(
    "SELECT organization_id FROM projects WHERE project_id = $1::uuid AND tenant_id = $2::uuid",
    [projectId, tenantId]
  );

  const row = result.rows[0];
  if (!row) {
    throw new ForbiddenError("Projektia ei loytynyt tenantista");
  }

  return { organizationId: row.organization_id };
};

export const requireProjectTenant = async (projectId: string, tenantId: string) => {
  await getProjectContext(projectId, tenantId);
};

export const requireWorkPhaseTenant = async (workPhaseId: string, tenantId: string) => {
  const result = await query(
    "SELECT 1 FROM work_phases wp JOIN projects p ON p.project_id = wp.project_id WHERE wp.work_phase_id = $1::uuid AND p.tenant_id = $2::uuid",
    [workPhaseId, tenantId]
  );

  if (result.rowCount === 0) {
    throw new ForbiddenError("Tyovaihe ei kuulu tenanttiin");
  }
};

export const requireCorrectionTenant = async (correctionId: string, tenantId: string) => {
  const result = await query(
    "SELECT 1 FROM work_phase_corrections c JOIN projects p ON p.project_id = c.project_id WHERE c.correction_id = $1::uuid AND p.tenant_id = $2::uuid",
    [correctionId, tenantId]
  );

  if (result.rowCount === 0) {
    throw new ForbiddenError("Korjaus ei kuulu tenanttiin");
  }
};
