import type {
  AdminPort,
  AuditPort,
  AuthPort,
  ForecastEventInput,
  ForecastPort,
  PlanningEventInput,
  PlanningPort,
  RbacPort,
  ReportPort,
  WorkPhasePort
} from "./ports";
import { ForbiddenError } from "@ennuste/shared";

export type AppServices = {
  auth: AuthPort;
  rbac: RbacPort;
  planning: PlanningPort;
  forecast: ForecastPort;
  report: ReportPort;
  admin: AdminPort;
  workPhases: WorkPhasePort;
  audit: AuditPort;
};

export const login = async (services: AppServices, input: { username: string; pin: string; projectId?: string }) => {
  const result = await services.auth.loginWithPin(input);
  return result;
};

export const createPlanningEvent = async (services: AppServices, input: PlanningEventInput) => {
  await services.rbac.requirePermission(input.projectId, input.createdBy, "REPORT_READ");
  const result = await services.planning.createPlanningEvent(input);
  await services.audit.recordEvent({
    projectId: input.projectId,
    actor: input.createdBy,
    action: "planning.create",
    payload: {
      planningEventId: result.planningEventId,
      targetLitteraId: input.targetLitteraId,
      status: input.status
    }
  });
  return result;
};

export const createForecastEvent = async (services: AppServices, input: ForecastEventInput) => {
  await services.rbac.requirePermission(input.projectId, input.createdBy, "REPORT_READ");
  const result = await services.forecast.createForecastEvent(input);
  await services.audit.recordEvent({
    projectId: input.projectId,
    actor: input.createdBy,
    action: "forecast.create",
    payload: {
      forecastEventId: result.forecastEventId,
      targetLitteraId: input.targetLitteraId,
      lineCount: input.lines.length
    }
  });
  return result;
};

export const loadDashboard = async (services: AppServices, input: { projectId: string; username: string }) => {
  await services.rbac.requirePermission(input.projectId, input.username, "REPORT_READ");
  return services.report.getDashboard(input.projectId);
};

export const loadWorkPhaseReport = async (services: AppServices, input: { projectId: string; username: string }) => {
  await services.rbac.requirePermission(input.projectId, input.username, "REPORT_READ");
  return services.report.getWorkPhaseReport(input.projectId);
};

export const loadForecastReport = async (services: AppServices, input: { projectId: string; username: string }) => {
  await services.rbac.requirePermission(input.projectId, input.username, "REPORT_READ");
  return services.report.getForecastReport(input.projectId);
};

export const loadPlanningReport = async (services: AppServices, input: { projectId: string; username: string }) => {
  await services.rbac.requirePermission(input.projectId, input.username, "REPORT_READ");
  return services.report.getPlanningReport(input.projectId);
};

export const loadTargetEstimate = async (services: AppServices, input: { projectId: string; username: string }) => {
  await services.rbac.requirePermission(input.projectId, input.username, "REPORT_READ");
  return services.report.getTargetEstimate(input.projectId);
};

export const loadMappingLines = async (services: AppServices, input: { projectId: string; username: string }) => {
  await services.rbac.requirePermission(input.projectId, input.username, "REPORT_READ");
  return services.report.getMappingLines(input.projectId);
};

export const loadAuditLog = async (services: AppServices, input: { projectId: string; username: string }) => {
  await services.rbac.requirePermission(input.projectId, input.username, "REPORT_READ");
  return services.report.getAuditLog(input.projectId);
};

export const loadAdminOverview = async (services: AppServices, input: { projectId: string; username: string }) => {
  await services.rbac.requirePermission(input.projectId, input.username, "MEMBERS_MANAGE");
  return services.admin.getAdminOverview(input.projectId);
};

export const loadWorkPhases = async (services: AppServices, input: { projectId: string; username: string }) => {
  await services.rbac.requirePermission(input.projectId, input.username, "REPORT_READ");
  return services.workPhases.listWorkPhases(input.projectId);
};

export const createWeeklyUpdate = async (
  services: AppServices,
  input: {
    projectId: string;
    workPhaseId: string;
    weekEnding: string;
    percentComplete: number;
    progressNotes?: string | null;
    risks?: string | null;
    username: string;
  }
) => {
  await services.rbac.requirePermission(input.projectId, input.username, "WORK_PHASE_WEEKLY_UPDATE_CREATE");
  const result = await services.workPhases.createWeeklyUpdate({
    projectId: input.projectId,
    workPhaseId: input.workPhaseId,
    weekEnding: input.weekEnding,
    percentComplete: input.percentComplete,
    progressNotes: input.progressNotes ?? null,
    risks: input.risks ?? null,
    createdBy: input.username
  });
  await services.audit.recordEvent({
    projectId: input.projectId,
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
    workPhaseId: string;
    weekEnding: string;
    costType: "LABOR" | "MATERIAL" | "SUBCONTRACT" | "RENTAL" | "OTHER";
    amount: number;
    description?: string | null;
    username: string;
  }
) => {
  await services.rbac.requirePermission(input.projectId, input.username, "GHOST_ENTRY_CREATE");
  const result = await services.workPhases.createGhostEntry({
    projectId: input.projectId,
    workPhaseId: input.workPhaseId,
    weekEnding: input.weekEnding,
    costType: input.costType,
    amount: input.amount,
    description: input.description ?? null,
    createdBy: input.username
  });
  await services.audit.recordEvent({
    projectId: input.projectId,
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
    username: string;
    notes?: string | null;
  }
) => {
  await services.rbac.requirePermission(input.projectId, input.username, "BASELINE_LOCK");
  const result = await services.workPhases.lockBaseline({
    workPhaseId: input.workPhaseId,
    workPhaseVersionId: input.workPhaseVersionId,
    targetImportBatchId: input.targetImportBatchId,
    username: input.username,
    notes: input.notes ?? null
  });
  await services.audit.recordEvent({
    projectId: input.projectId,
    actor: input.username,
    action: "work_phase.baseline_lock",
    payload: { workPhaseId: input.workPhaseId, baselineId: result.workPhaseBaselineId }
  });
  return result;
};

export const proposeCorrection = async (
  services: AppServices,
  input: { projectId: string; workPhaseId: string; itemCode: string; username: string; notes?: string | null }
) => {
  await services.rbac.requirePermission(input.projectId, input.username, "CORRECTION_PROPOSE");
  const result = await services.workPhases.proposeCorrection({
    workPhaseId: input.workPhaseId,
    itemCode: input.itemCode,
    username: input.username,
    notes: input.notes ?? null
  });
  await services.audit.recordEvent({
    projectId: input.projectId,
    actor: input.username,
    action: "work_phase.correction_proposed",
    payload: { workPhaseId: input.workPhaseId, correctionId: result.correctionId }
  });
  return result;
};

export const approveCorrectionPm = async (
  services: AppServices,
  input: { projectId: string; correctionId: string; username: string; comment?: string | null }
) => {
  await services.rbac.requirePermission(input.projectId, input.username, "CORRECTION_APPROVE_PM");
  await services.workPhases.approveCorrectionPm({
    correctionId: input.correctionId,
    username: input.username,
    comment: input.comment ?? null
  });
  await services.audit.recordEvent({
    projectId: input.projectId,
    actor: input.username,
    action: "work_phase.correction_pm_approved",
    payload: { correctionId: input.correctionId }
  });
};

export const approveCorrectionFinal = async (
  services: AppServices,
  input: { projectId: string; correctionId: string; username: string; comment?: string | null }
) => {
  await services.rbac.requirePermission(input.projectId, input.username, "CORRECTION_APPROVE_FINAL");
  const result = await services.workPhases.approveCorrectionFinal({
    correctionId: input.correctionId,
    username: input.username,
    comment: input.comment ?? null
  });
  await services.audit.recordEvent({
    projectId: input.projectId,
    actor: input.username,
    action: "work_phase.correction_final_approved",
    payload: { correctionId: input.correctionId, baselineId: result.baselineId }
  });
  return result;
};

export const ensureDemoRoleSwitchAllowed = (isDemo: boolean) => {
  if (!isDemo) {
    throw new ForbiddenError("Pikavaihto on sallittu vain demo-tilassa");
  }
};
