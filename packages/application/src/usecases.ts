import type {
  AdminPort,
  AuditPort,
  AuthPort,
  ForecastEventInput,
  ForecastPort,
  HealthPort,
  ImportStagingPort,
  SaasPort,
  PlanningEventInput,
  PlanningPort,
  RbacPort,
  ReportPort,
  WorkPhasePort
} from "./ports";
import { AppError } from "@ennuste/shared";

export type AppServices = {
  auth: AuthPort;
  health: HealthPort;
  rbac: RbacPort;
  planning: PlanningPort;
  forecast: ForecastPort;
  report: ReportPort;
  importStaging: ImportStagingPort;
  saas: SaasPort;
  admin: AdminPort;
  workPhases: WorkPhasePort;
  audit: AuditPort;
};

export const checkHealth = async (services: AppServices) => {
  return services.health.check();
};

export const login = async (services: AppServices, input: { username: string; pin: string; projectId?: string }) => {
  const result = await services.auth.loginWithPin(input);
  await services.audit.recordEvent({
    projectId: result.session.projectId,
    tenantId: result.session.tenantId,
    actor: result.session.username,
    action: "auth.login",
    payload: {
      projectSelected: Boolean(input.projectId)
    }
  });
  return result;
};

export const switchProject = async (
  services: AppServices,
  input: { username: string; projectId: string }
) => {
  const result = await services.auth.switchProject({
    username: input.username,
    projectId: input.projectId
  });
  await services.audit.recordEvent({
    projectId: result.session.projectId,
    tenantId: result.session.tenantId,
    actor: result.session.username,
    action: "auth.switch_project",
    payload: {
      projectId: result.session.projectId
    }
  });
  return result;
};

export const listUserProjects = async (
  services: AppServices,
  input: { username: string }
) => {
  return services.auth.listUserProjects(input.username);
};

export const createPlanningEvent = async (services: AppServices, input: PlanningEventInput) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.createdBy, "PLANNING_WRITE");
  const result = await services.planning.createPlanningEvent(input);
  await services.audit.recordEvent({
    projectId: input.projectId,
    tenantId: input.tenantId,
    actor: input.createdBy,
    action: "planning.create",
    payload: {
      planningEventId: result.planningEventId,
      targetLitteraId: input.targetLitteraId,
      status: input.status,
      summary: input.summary ?? null
    }
  });
  return result;
};

export const createForecastEvent = async (services: AppServices, input: ForecastEventInput) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.createdBy, "FORECAST_WRITE");
  const planning = await services.planning.getLatestPlanningStatus(
    input.projectId,
    input.tenantId,
    input.targetLitteraId
  );
  if (!planning) {
    throw new AppError("Suunnitelma puuttuu tavoitearvio-litteralta.", "PLANNING_MISSING", 409);
  }
  if (planning.status !== "LOCKED") {
    throw new AppError(
      `Suunnitelman tila on ${planning.status}. Ennustaminen vaatii lukituksen (LOCKED).`,
      "LOCK_REQUIRED",
      409
    );
  }
  const result = await services.forecast.createForecastEvent(input);
  await services.audit.recordEvent({
    projectId: input.projectId,
    tenantId: input.tenantId,
    actor: input.createdBy,
    action: "forecast.create",
    payload: {
      forecastEventId: result.forecastEventId,
      targetLitteraId: input.targetLitteraId,
      lineCount: input.lines.length,
      summary: input.comment ?? null
    }
  });
  return result;
};

export const loadDashboard = async (services: AppServices, input: { projectId: string; tenantId: string; username: string }) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "REPORT_READ");
  return services.report.getDashboard(input.projectId, input.tenantId);
};

export const loadWorkPhaseReport = async (services: AppServices, input: { projectId: string; tenantId: string; username: string }) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "REPORT_READ");
  return services.report.getWorkPhaseReport(input.projectId, input.tenantId);
};

export const loadForecastReport = async (services: AppServices, input: { projectId: string; tenantId: string; username: string }) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "REPORT_READ");
  return services.report.getForecastReport(input.projectId, input.tenantId);
};

export const loadForecastSnapshot = async (
  services: AppServices,
  input: { projectId: string; tenantId: string; username: string; targetLitteraId: string }
) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "REPORT_READ");
  return services.forecast.getForecastSnapshot(input.projectId, input.tenantId, input.targetLitteraId);
};

export const loadPlanningReport = async (services: AppServices, input: { projectId: string; tenantId: string; username: string }) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "REPORT_READ");
  return services.report.getPlanningReport(input.projectId, input.tenantId);
};

export const loadPlanningStatus = async (
  services: AppServices,
  input: { projectId: string; tenantId: string; username: string; targetLitteraId: string }
) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "REPORT_READ");
  return services.planning.getLatestPlanningStatus(input.projectId, input.tenantId, input.targetLitteraId);
};

export const loadTargetEstimate = async (services: AppServices, input: { projectId: string; tenantId: string; username: string }) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "REPORT_READ");
  return services.report.getTargetEstimate(input.projectId, input.tenantId);
};

export const loadMappingVersions = async (services: AppServices, input: { projectId: string; tenantId: string; username: string }) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "REPORT_READ");
  return services.report.getMappingVersions(input.projectId, input.tenantId);
};

export const loadMappingLines = async (services: AppServices, input: { projectId: string; tenantId: string; username: string }) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "REPORT_READ");
  return services.report.getMappingLines(input.projectId, input.tenantId);
};

export const loadAuditLog = async (services: AppServices, input: { projectId: string; tenantId: string; username: string }) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "REPORT_READ");
  return services.report.getAuditLog(input.projectId, input.tenantId);
};

export const loadFilteredAuditLog = async (
  services: AppServices,
  input: { projectId: string; tenantId: string; username: string; actionFilter?: string[] | null }
) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "REPORT_READ");
  return services.report.getAuditLog(input.projectId, input.tenantId, input.actionFilter ?? null);
};

export const loadWorkflowStatus = async (
  services: AppServices,
  input: { projectId: string; tenantId: string; username: string }
) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "REPORT_READ");
  return services.report.getWorkflowStatus(input.projectId, input.tenantId);
};

export const createBudgetStaging = async (
  services: AppServices,
  input: { projectId: string; tenantId: string; username: string; importedBy: string; fileName?: string | null; csvText: string }
) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "REPORT_READ");
  const result = await services.importStaging.createBudgetStagingBatch({
    projectId: input.projectId,
    tenantId: input.tenantId,
    importedBy: input.importedBy,
    fileName: input.fileName ?? null,
    csvText: input.csvText
  });
  await services.audit.recordEvent({
    projectId: input.projectId,
    tenantId: input.tenantId,
    actor: input.importedBy,
    action: "import_staging.create",
    payload: {
      staging_batch_id: result.stagingBatchId,
      file_name: input.fileName ?? null,
      warnings: result.warnings
    }
  });
  return result;
};

export const loadStagingBatches = async (
  services: AppServices,
  input: { projectId: string; tenantId: string; username: string }
) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "REPORT_READ");
  return services.importStaging.listBatches(input.projectId, input.tenantId);
};

export const loadStagingLines = async (
  services: AppServices,
  input: {
    projectId: string;
    tenantId: string;
    username: string;
    batchId: string;
    mode: "issues" | "clean" | "all";
    severity?: "ERROR" | "WARN" | "INFO" | null;
  }
) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "REPORT_READ");
  return services.importStaging.listLines({
    projectId: input.projectId,
    tenantId: input.tenantId,
    batchId: input.batchId,
    mode: input.mode,
    severity: input.severity ?? null
  });
};

export const editStagingLine = async (
  services: AppServices,
  input: {
    projectId: string;
    tenantId: string;
    username: string;
    lineId: string;
    edit: Record<string, unknown>;
    reason?: string | null;
  }
) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "REPORT_READ");
  const result = await services.importStaging.editLine({
    projectId: input.projectId,
    tenantId: input.tenantId,
    lineId: input.lineId,
    editedBy: input.username,
    edit: input.edit,
    reason: input.reason ?? null
  });
  await services.audit.recordEvent({
    projectId: input.projectId,
    tenantId: input.tenantId,
    actor: input.username,
    action: "import_staging.edit",
    payload: { staging_line_id: input.lineId, reason: input.reason ?? null }
  });
  return result;
};

export const approveStagingBatch = async (
  services: AppServices,
  input: { projectId: string; tenantId: string; username: string; batchId: string; message?: string | null }
) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "REPORT_READ");
  const result = await services.importStaging.addBatchEvent({
    projectId: input.projectId,
    tenantId: input.tenantId,
    batchId: input.batchId,
    status: "APPROVED",
    message: input.message ?? null,
    actor: input.username
  });
  await services.audit.recordEvent({
    projectId: input.projectId,
    tenantId: input.tenantId,
    actor: input.username,
    action: "import_staging.approve",
    payload: { staging_batch_id: input.batchId, message: input.message ?? null }
  });
  return result;
};

export const rejectStagingBatch = async (
  services: AppServices,
  input: { projectId: string; tenantId: string; username: string; batchId: string; message?: string | null }
) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "REPORT_READ");
  const result = await services.importStaging.addBatchEvent({
    projectId: input.projectId,
    tenantId: input.tenantId,
    batchId: input.batchId,
    status: "REJECTED",
    message: input.message ?? null,
    actor: input.username
  });
  await services.audit.recordEvent({
    projectId: input.projectId,
    tenantId: input.tenantId,
    actor: input.username,
    action: "import_staging.reject",
    payload: { staging_batch_id: input.batchId, message: input.message ?? null }
  });
  return result;
};

export const loadStagingSummary = async (
  services: AppServices,
  input: { projectId: string; tenantId: string; username: string; batchId: string }
) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "REPORT_READ");
  return services.importStaging.getSummary({
    projectId: input.projectId,
    tenantId: input.tenantId,
    batchId: input.batchId
  });
};

export const commitStagingBatch = async (
  services: AppServices,
  input: {
    projectId: string;
    tenantId: string;
    username: string;
    batchId: string;
    message?: string | null;
    allowDuplicate?: boolean;
    force?: boolean;
  }
) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "REPORT_READ");
  const result = await services.importStaging.commitBatch({
    projectId: input.projectId,
    tenantId: input.tenantId,
    batchId: input.batchId,
    committedBy: input.username,
    message: input.message ?? null,
    allowDuplicate: input.allowDuplicate ?? false,
    force: input.force ?? false
  });
  await services.audit.recordEvent({
    projectId: input.projectId,
    tenantId: input.tenantId,
    actor: input.username,
    action: "import_staging.commit",
    payload: {
      staging_batch_id: input.batchId,
      import_batch_id: result.importBatchId,
      inserted_rows: result.insertedRows,
      message: input.message ?? null
    }
  });
  return result;
};

export const exportStagingBatch = async (
  services: AppServices,
  input: { projectId: string; tenantId: string; username: string; batchId: string; mode: "clean" | "all" }
) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "REPORT_READ");
  return services.importStaging.exportBatch({
    projectId: input.projectId,
    tenantId: input.tenantId,
    batchId: input.batchId,
    mode: input.mode
  });
};

export const createGroup = async (
  services: AppServices,
  input: { projectId: string; tenantId: string; username: string; name: string }
) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "SAAS_ONBOARDING_MANAGE");
  const result = await services.saas.createGroup({
    name: input.name,
    createdBy: input.username
  });
  await services.audit.recordEvent({
    projectId: input.projectId,
    tenantId: input.tenantId,
    actor: input.username,
    action: "group.create",
    payload: { group_id: result.groupId, name: input.name }
  });
  return result;
};

export const createOrganizationWithInvite = async (
  services: AppServices,
  input: {
    projectId: string;
    tenantId: string;
    username: string;
    groupId?: string | null;
    name: string;
    slug: string;
    adminEmail: string;
  }
) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "SAAS_ONBOARDING_MANAGE");
  const result = await services.saas.createOrganizationWithInvite({
    groupId: input.groupId ?? null,
    name: input.name,
    slug: input.slug,
    adminEmail: input.adminEmail,
    createdBy: input.username
  });
  await services.audit.recordEvent({
    projectId: input.projectId,
    tenantId: input.tenantId,
    actor: input.username,
    action: "organization.create",
    payload: {
      organization_id: result.organizationId,
      tenant_id: result.tenantId,
      demo_project_id: result.projectId,
      admin_email: input.adminEmail
    }
  });
  await services.audit.recordEvent({
    projectId: input.projectId,
    tenantId: input.tenantId,
    actor: input.username,
    action: "invite.create",
    payload: {
      organization_id: result.organizationId,
      invite_id: result.inviteId
    }
  });
  return result;
};

export const createOrganizationInvite = async (
  services: AppServices,
  input: {
    projectId: string;
    tenantId: string;
    username: string;
    organizationId: string;
    email: string;
    roleCode?: string | null;
  }
) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "SAAS_ONBOARDING_MANAGE");
  const result = await services.saas.createOrgInvite({
    organizationId: input.organizationId,
    email: input.email,
    roleCode: input.roleCode ?? null,
    createdBy: input.username
  });
  await services.audit.recordEvent({
    projectId: input.projectId,
    tenantId: input.tenantId,
    actor: input.username,
    action: "invite.create",
    payload: { organization_id: input.organizationId, invite_id: result.inviteId }
  });
  return result;
};

export const acceptInvite = async (
  services: AppServices,
  input: { token: string; pin: string; displayName?: string | null }
) => {
  const result = await services.saas.acceptInvite({
    token: input.token,
    pin: input.pin,
    displayName: input.displayName ?? null
  });
  return result;
};

export const loadAdminOverview = async (services: AppServices, input: { projectId: string; tenantId: string; username: string }) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "MEMBERS_MANAGE");
  return services.admin.getAdminOverview(input.projectId, input.tenantId);
};

export const loadWorkPhases = async (services: AppServices, input: { projectId: string; tenantId: string; username: string }) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "REPORT_READ");
  return services.workPhases.listWorkPhases(input.projectId, input.tenantId);
};

export const createWeeklyUpdate = async (
  services: AppServices,
  input: {
    projectId: string;
    tenantId: string;
    workPhaseId: string;
    weekEnding: string;
    percentComplete: number;
    progressNotes?: string | null;
    risks?: string | null;
    username: string;
  }
) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "WORK_PHASE_WEEKLY_UPDATE_CREATE");
  const result = await services.workPhases.createWeeklyUpdate({
    projectId: input.projectId,
    tenantId: input.tenantId,
    workPhaseId: input.workPhaseId,
    weekEnding: input.weekEnding,
    percentComplete: input.percentComplete,
    progressNotes: input.progressNotes ?? null,
    risks: input.risks ?? null,
    createdBy: input.username
  });
  await services.audit.recordEvent({
    projectId: input.projectId,
    tenantId: input.tenantId,
    actor: input.username,
    action: "work_phase.weekly_update",
    payload: { workPhaseId: input.workPhaseId, updateId: result.workPhaseWeeklyUpdateId }
  });
  return result;
};

export const createGhostEntry = async (
  services: AppServices,
  input: {
    projectId: string;
    tenantId: string;
    workPhaseId: string;
    weekEnding: string;
    costType: "LABOR" | "MATERIAL" | "SUBCONTRACT" | "RENTAL" | "OTHER";
    amount: number;
    description?: string | null;
    username: string;
  }
) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "GHOST_ENTRY_CREATE");
  const result = await services.workPhases.createGhostEntry({
    projectId: input.projectId,
    tenantId: input.tenantId,
    workPhaseId: input.workPhaseId,
    weekEnding: input.weekEnding,
    costType: input.costType,
    amount: input.amount,
    description: input.description ?? null,
    createdBy: input.username
  });
  await services.audit.recordEvent({
    projectId: input.projectId,
    tenantId: input.tenantId,
    actor: input.username,
    action: "work_phase.ghost_entry",
    payload: { workPhaseId: input.workPhaseId, ghostId: result.ghostCostEntryId }
  });
  return result;
};

export const lockBaseline = async (
  services: AppServices,
  input: {
    workPhaseId: string;
    workPhaseVersionId: string;
    targetImportBatchId: string;
    projectId: string;
    tenantId: string;
    username: string;
    notes?: string | null;
  }
) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "BASELINE_LOCK");
  const result = await services.workPhases.lockBaseline({
    workPhaseId: input.workPhaseId,
    workPhaseVersionId: input.workPhaseVersionId,
    targetImportBatchId: input.targetImportBatchId,
    tenantId: input.tenantId,
    username: input.username,
    notes: input.notes ?? null
  });
  await services.audit.recordEvent({
    projectId: input.projectId,
    tenantId: input.tenantId,
    actor: input.username,
    action: "work_phase.baseline_lock",
    payload: { workPhaseId: input.workPhaseId, baselineId: result.workPhaseBaselineId }
  });
  return result;
};

export const proposeCorrection = async (
  services: AppServices,
  input: { projectId: string; tenantId: string; workPhaseId: string; itemCode: string; username: string; notes?: string | null }
) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "CORRECTION_PROPOSE");
  const result = await services.workPhases.proposeCorrection({
    workPhaseId: input.workPhaseId,
    itemCode: input.itemCode,
    tenantId: input.tenantId,
    username: input.username,
    notes: input.notes ?? null
  });
  await services.audit.recordEvent({
    projectId: input.projectId,
    tenantId: input.tenantId,
    actor: input.username,
    action: "work_phase.correction_proposed",
    payload: { workPhaseId: input.workPhaseId, correctionId: result.correctionId }
  });
  return result;
};

export const approveCorrectionPm = async (
  services: AppServices,
  input: { projectId: string; tenantId: string; correctionId: string; username: string; comment?: string | null }
) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "CORRECTION_APPROVE_PM");
  await services.workPhases.approveCorrectionPm({
    correctionId: input.correctionId,
    tenantId: input.tenantId,
    username: input.username,
    comment: input.comment ?? null
  });
  await services.audit.recordEvent({
    projectId: input.projectId,
    tenantId: input.tenantId,
    actor: input.username,
    action: "work_phase.correction_pm_approved",
    payload: { correctionId: input.correctionId }
  });
};

export const approveCorrectionFinal = async (
  services: AppServices,
  input: { projectId: string; tenantId: string; correctionId: string; username: string; comment?: string | null }
) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "CORRECTION_APPROVE_FINAL");
  const result = await services.workPhases.approveCorrectionFinal({
    correctionId: input.correctionId,
    tenantId: input.tenantId,
    username: input.username,
    comment: input.comment ?? null
  });
  await services.audit.recordEvent({
    projectId: input.projectId,
    tenantId: input.tenantId,
    actor: input.username,
    action: "work_phase.correction_final_approved",
    payload: { correctionId: input.correctionId, baselineId: result.baselineId }
  });
  return result;
};
